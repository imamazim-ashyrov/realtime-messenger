import { memo, useMemo, useState } from "react";
import { decryptMessage } from "../../../utils/crypto";
import VoiceMessage from "./VoiceMessage";
import CallSummary from "./CallSummary";

// Модульный кэш уже загруженных картинок — переживает unmount/remount,
// который react-virtuoso делает при скролле. Иначе при возврате к сообщению
// skeleton показывается заново и происходит мерцание.
const loadedImageUrls = new Set();

const LazyImage = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(() => loadedImageUrls.has(src));
  const handleLoad = () => {
    loadedImageUrls.add(src);
    setLoaded(true);
  };
  return (
    <div className="relative mb-1 inline-block max-w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
      {!loaded && (
        <div className="skeleton h-40 w-64 max-w-full" aria-hidden="true" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        className={`block max-h-64 max-w-full object-cover ${
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
      />
    </div>
  );
};

const SingleCheck = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12 10 17 20 7" />
  </svg>
);

const DoubleCheck = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 12 8 17 18 7" />
    <polyline points="8 12 13 17 23 7" />
  </svg>
);

const ClockIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const FailIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
  </svg>
);

const MessageBubble = ({
  msg,
  chatId,
  currentUserUid,
  isCurrentUser,
  isFirstInGroup = true,
  isLastInGroup = true,
  onSelect,
  onReact,
}) => {
  const handleClick = () => onSelect?.(msg);
  const handleReact = (emoji) => onReact?.(msg, emoji);
  const createdAt = msg.createdAt?.toDate?.();

  const decryptedText = useMemo(
    () => (msg.text ? decryptMessage(msg.text, chatId) : ""),
    [msg.text, chatId],
  );

  const replyPreview = useMemo(() => {
    if (!msg.replyTo) return "";
    if (msg.replyTo.text) return decryptMessage(msg.replyTo.text, chatId);
    return msg.replyTo.hasImage ? "📷 Фотография" : "";
  }, [msg.replyTo, chatId]);

  const activeReactions = msg.reactions
    ? Object.entries(msg.reactions).filter(([, uids]) => uids?.length > 0)
    : [];

  if (msg.callSummary) {
    return <CallSummary msg={msg} isCurrentUser={isCurrentUser} />;
  }

  const isRead = msg.status === "read";
  const isPending = msg._pending === true;
  const isFailed = msg._failed === true;

  // Telegram-style group corners: внешняя сторона (away-side) всегда полностью
  // скруглена; speaker-side получает «тугие» углы там, где пузырь стыкуется
  // с соседним сообщением того же автора.
  const cornerClasses = isCurrentUser
    ? `rounded-2xl rounded-br-md ${!isFirstInGroup ? "rounded-tr-md" : ""}`
    : `rounded-2xl rounded-bl-md ${!isFirstInGroup ? "rounded-tl-md" : ""}`;

  const groupSpacing = isFirstInGroup ? "mt-3" : "mt-0.5";

  return (
    <div className={`flex ${groupSpacing} ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[75%] min-w-0 flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
        <div
          className={`${cornerClasses} max-w-full px-3.5 py-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
            isCurrentUser
              ? "bg-blue-500 text-white"
              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/60"
          } ${isPending ? "opacity-70" : ""} ${isFailed ? "ring-2 ring-red-400/60" : ""}`}
          onClick={handleClick}
          title={isFailed ? "Не отправлено — нажмите для повтора" : "Нажмите для действий"}
        >
          {msg.replyTo && (
            <div
              className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${
                isCurrentUser
                  ? "border-blue-200 bg-blue-400/40"
                  : "border-blue-400 bg-slate-100 dark:bg-slate-700/60"
              }`}
            >
              <span
                className={`block font-semibold ${
                  isCurrentUser ? "text-blue-50" : "text-blue-600 dark:text-blue-400"
                }`}
              >
                {msg.replyTo.senderName}
              </span>
              <span
                className={`block truncate ${
                  isCurrentUser ? "text-blue-50/90" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {replyPreview}
              </span>
            </div>
          )}

          {msg.imageUrl && <LazyImage src={msg.imageUrl} alt="Вложение" />}

          {msg.audioUrl && (
            <VoiceMessage
              audioUrl={msg.audioUrl}
              durationHint={msg.audioDuration || 0}
              isCurrentUser={isCurrentUser}
            />
          )}

          {decryptedText && (
            <p className="text-sm whitespace-pre-wrap wrap-anywhere">{decryptedText}</p>
          )}

          {isLastInGroup && (
            <div className={`flex items-center gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              <span className={`text-[10px] ${isCurrentUser ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>
                {createdAt
                  ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "..."}
              </span>
              {isCurrentUser &&
                (isFailed ? (
                  <FailIcon className="h-3.5 w-3.5 text-red-300" />
                ) : isPending ? (
                  <ClockIcon className="h-3.5 w-3.5 text-blue-100/80" />
                ) : isRead ? (
                  <DoubleCheck className="h-3.5 w-3.5 text-blue-100" />
                ) : (
                  <SingleCheck className="h-3.5 w-3.5 text-blue-100/70" />
                ))}
            </div>
          )}
        </div>

        {activeReactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
            {activeReactions.map(([emoji, uids]) => {
              const reactedByMe = uids.includes(currentUserUid);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
                    reactedByMe
                      ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MessageBubble);
