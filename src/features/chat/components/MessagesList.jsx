import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

const NEAR_BOTTOM_THRESHOLD = 120;

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

// MessagesList монтируется заново при каждой смене чата (key={chatId} в
// ChatWindow). Это даёт чистое начальное состояние без ref-трекеров.
const MessagesList = ({
  messages,
  currentUserUid,
  chatId,
  onMessageClick,
  onToggleReaction,
}) => {
  const containerRef = useRef(null);
  const visibleMessages = messages.filter(
    (msg) => !msg.deletedFor?.includes(currentUserUid),
  );
  const messagesCount = visibleMessages.length;

  // anchorLen — длина списка на момент когда пользователь был у низа;
  // всё, что появилось сверх неё, идёт в счётчик «непрочитанных» в плашке.
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [anchorLen, setAnchorLen] = useState(messagesCount);

  const unseenCount = isNearBottom
    ? 0
    : visibleMessages
        .slice(anchorLen)
        .filter((m) => m.senderId !== currentUserUid).length;

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    setIsNearBottom(near);
    if (near) setAnchorLen(messagesCount);
  };

  // Маунт + первая отрисовка — мгновенно к низу.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Новое сообщение при положении у низа — плавно вниз.
  useEffect(() => {
    if (!isNearBottom) return;
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messagesCount, isNearBottom]);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Группировка по датам.
  const renderedItems = [];
  let lastDate = null;
  visibleMessages.forEach((msg) => {
    const ts = msg.createdAt?.toDate?.();
    if (ts && (!lastDate || !sameDay(ts, lastDate))) {
      renderedItems.push({
        type: "separator",
        key: `sep-${ts.getTime()}`,
        label: formatDayLabel(ts),
      });
      lastDate = ts;
    }
    renderedItems.push({ type: "msg", key: msg.id, msg });
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 pt-4 pb-28 bg-chat-pattern"
      >
        {renderedItems.map((item) => {
          if (item.type === "separator") {
            return (
              <div key={item.key} className="flex justify-center my-4">
                <span className="rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200/60 dark:border-gray-700/60">
                  {item.label}
                </span>
              </div>
            );
          }
          return (
            <MessageBubble
              key={item.key}
              msg={item.msg}
              chatId={chatId}
              currentUserUid={currentUserUid}
              isCurrentUser={item.msg.senderId === currentUserUid}
              onSelect={onMessageClick}
              onReact={onToggleReaction}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={scrollToBottom}
        aria-label="К последним сообщениям"
        className={`absolute right-4 bottom-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
          isNearBottom ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
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
