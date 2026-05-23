import { memo, useMemo } from "react";
import { decryptMessage } from "../../../utils/crypto";
import VoiceMessage from "./VoiceMessage";
import CallSummary from "./CallSummary";

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

const MessageBubble = ({
  msg,
  chatId,
  currentUserUid,
  isCurrentUser,
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

  return (
    <div className={`flex mt-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[75%] flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3.5 py-2 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
            isCurrentUser
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-gray-700/60"
          }`}
          onClick={handleClick}
          title="Нажмите для действий"
        >
          {msg.replyTo && (
            <div
              className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${
                isCurrentUser
                  ? "border-blue-200 bg-blue-400/40"
                  : "border-blue-400 bg-gray-100 dark:bg-gray-700/60"
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
                  isCurrentUser ? "text-blue-50/90" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {replyPreview}
              </span>
            </div>
          )}

          {msg.imageUrl && (
            <img
              src={msg.imageUrl}
              alt="Вложение"
              className="rounded-lg max-w-full h-auto mb-1 max-h-64 object-cover"
            />
          )}

          {msg.audioUrl && (
            <VoiceMessage
              audioUrl={msg.audioUrl}
              durationHint={msg.audioDuration || 0}
              isCurrentUser={isCurrentUser}
            />
          )}

          {decryptedText && (
            <p className="text-sm whitespace-pre-wrap break-words">{decryptedText}</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] ${isCurrentUser ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}>
              {createdAt
                ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "..."}
            </span>
            {isCurrentUser && (
              isRead ? (
                <DoubleCheck className="h-3.5 w-3.5 text-blue-100" />
              ) : (
                <SingleCheck className="h-3.5 w-3.5 text-blue-100/70" />
              )
            )}
          </div>
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
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
