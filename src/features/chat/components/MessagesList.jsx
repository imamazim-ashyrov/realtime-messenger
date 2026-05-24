import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import MessageBubble from "./MessageBubble";

// List передаётся react-virtuoso как контейнер виртуализованных строк;
// форвардит ref внутрь, поэтому override должен быть forwardRef.
const ListContainer = forwardRef(function ListContainer(props, ref) {
  return <div {...props} ref={ref} className="px-4" />;
});

const ListHeader = () => <div className="h-4" aria-hidden="true" />;

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDayLabel = (date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - target) / 86400000);

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "long" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// MessagesList монтируется заново при каждой смене чата (key={chatId}
// в ChatWindow). Внутри — react-virtuoso: рендерит только видимые элементы.
const MessagesList = ({
  messages,
  currentUserUid,
  chatId,
  onMessageClick,
  onToggleReaction,
}) => {
  const virtuosoRef = useRef(null);
  const scrollerElRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  // Данные + флаги группировки/разделителей за один проход + спейсер в конце.
  // Спейсер — обычный item, поэтому scrollToIndex(last, end) дотягивает до
  // самого низа включая отступ перед input (в отличие от Virtuoso Footer'а,
  // который не участвует в scrollToIndex-математике).
  const { dataItems, renderedItems } = useMemo(() => {
    const GROUP_GAP_MS = 2 * 60 * 1000;
    const visibleMessages = messages.filter(
      (msg) => !msg.deletedFor?.includes(currentUserUid),
    );
    const out = [];
    let lastDate = null;
    let lastSenderId = null;
    let lastTimeMs = null;

    visibleMessages.forEach((msg) => {
      const ts = msg.createdAt?.toDate?.();
      let dayChanged = false;
      if (ts && (!lastDate || !sameDay(ts, lastDate))) {
        out.push({
          type: "separator",
          key: `sep-${ts.getTime()}`,
          label: formatDayLabel(ts),
        });
        lastDate = ts;
        dayChanged = true;
      }
      const sameSender = msg.senderId === lastSenderId;
      const closeInTime =
        lastTimeMs && ts && ts.getTime() - lastTimeMs < GROUP_GAP_MS;
      const isFirstInGroup = dayChanged || !sameSender || !closeInTime;
      out.push({ type: "msg", key: msg.id, msg, isFirstInGroup });
      lastSenderId = msg.senderId;
      lastTimeMs = ts ? ts.getTime() : lastTimeMs;
    });

    for (let i = 0; i < out.length; i++) {
      if (out[i].type !== "msg") continue;
      let isLast = true;
      for (let j = i + 1; j < out.length; j++) {
        if (out[j].type === "msg") {
          isLast = out[j].isFirstInGroup;
          break;
        }
      }
      out[i].isLastInGroup = isLast;
    }

    const rendered = [...out, { type: "spacer", key: "bottom-spacer" }];
    return { dataItems: out, renderedItems: rendered };
  }, [messages, currentUserUid]);

  // Стартовая позиция: на первом непрочитанном сообщении (incoming + status=sent).
  // Если непрочитанных нет — на последнем элементе данных (= у низа).
  // Считается при первом рендере когда messages не пустые. Дальше не меняется.
  const [initialIndex, setInitialIndex] = useState(null);
  if (initialIndex === null && dataItems.length > 0) {
    let firstUnread = -1;
    for (let i = 0; i < dataItems.length; i++) {
      const it = dataItems[i];
      if (
        it.type === "msg" &&
        it.msg.senderId !== currentUserUid &&
        it.msg.status === "sent"
      ) {
        firstUnread = i;
        break;
      }
    }
    if (firstUnread >= 0) {
      // Первое непрочитанное — выравниваем к верху viewport, чтобы пользователь
      // видел: «вот отсюда новое, выше — уже прочитанное».
      setInitialIndex({ index: firstUnread, align: "start", offset: -8 });
    } else {
      // Нет непрочитанных — стартуем у самого низа через спейсер.
      setInitialIndex({
        index: renderedItems.length - 1,
        align: "end",
      });
    }
  }

  // Подсчёт «непрочитанных» пока пользователь не у низа (плашка на стрелке).
  const [anchorCount, setAnchorCount] = useState(dataItems.length);
  if (atBottom) {
    if (anchorCount !== dataItems.length) setAnchorCount(dataItems.length);
    if (unseenCount !== 0) setUnseenCount(0);
  } else if (dataItems.length > anchorCount) {
    const newOnes = dataItems
      .slice(anchorCount)
      .filter((it) => it.type === "msg" && it.msg.senderId !== currentUserUid).length;
    const nextCount = dataItems.length;
    if (newOnes > 0) {
      setAnchorCount(nextCount);
      setUnseenCount((c) => c + newOnes);
    } else if (anchorCount !== nextCount) {
      setAnchorCount(nextCount);
    }
  }

  // При отправке своего сообщения дожимаем скролл до спейсера (= самого низа).
  const lastDataItem = dataItems[dataItems.length - 1];
  const lastIsOwn =
    lastDataItem?.type === "msg" && lastDataItem.msg.senderId === currentUserUid;
  const lastItemKey = lastDataItem?.key;

  useEffect(() => {
    if (!lastIsOwn || renderedItems.length === 0) return undefined;
    // Два rAF: рендер новой строки → измерение react-virtuoso → корректный scroll.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: renderedItems.length - 1,
          align: "end",
          behavior: "smooth",
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [lastItemKey, lastIsOwn, renderedItems.length]);

  const scrollToBottom = () => {
    if (renderedItems.length === 0) return;
    virtuosoRef.current?.scrollToIndex({
      index: renderedItems.length - 1,
      align: "end",
      behavior: "smooth",
    });
  };

  // Пока сообщения не подгрузились — пустой фон чата, без Virtuoso.
  // initialTopMostItemIndex считывается только на маунте, и пустой массив
  // дал бы initialIndex=null → стартовая позиция была бы некорректной.
  if (dataItems.length === 0 || initialIndex === null) {
    return <div className="absolute inset-0 overflow-hidden bg-chat-pattern" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-chat-pattern">
      <Virtuoso
        ref={virtuosoRef}
        scrollerRef={(el) => {
          scrollerElRef.current = el;
        }}
        data={renderedItems}
        initialTopMostItemIndex={initialIndex}
        // Для чужих сообщений: автоскролл только если пользователь и так у низа.
        // Свои сообщения обрабатываются эффектом выше.
        followOutput={(isAtBottom) => (isAtBottom ? "smooth" : false)}
        atBottomStateChange={setAtBottom}
        atBottomThreshold={120}
        className="h-full"
        components={{
          List: ListContainer,
          Header: ListHeader,
        }}
        itemContent={(_index, item) => {
          if (item.type === "spacer") {
            return <div className="h-6" aria-hidden="true" />;
          }
          if (item.type === "separator") {
            return (
              <div className="flex justify-center my-4">
                <span className="rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                  {item.label}
                </span>
              </div>
            );
          }
          return (
            <MessageBubble
              msg={item.msg}
              chatId={chatId}
              currentUserUid={currentUserUid}
              isCurrentUser={item.msg.senderId === currentUserUid}
              isFirstInGroup={item.isFirstInGroup}
              isLastInGroup={item.isLastInGroup}
              onSelect={onMessageClick}
              onReact={onToggleReaction}
            />
          );
        }}
      />

      <button
        type="button"
        onClick={scrollToBottom}
        aria-label="К последним сообщениям"
        className={`absolute right-4 bottom-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 ${
          atBottom ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white shadow">
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MessagesList;
