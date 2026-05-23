import { memo, useMemo } from "react";
import { decryptMessage } from "../../../utils/crypto";

const MessageBubble = ({
  msg,
  chatId,
  currentUserUid,
  isCurrentUser,
  isLatestReadOwnMessage,
  onSelect,
  onReact,
}) => {
  // Локальные обёртки нужны, чтобы наружу торчали стабильные ссылки на
  // onSelect/onReact, и memo мог пропускать рендер при обновлении соседей.
  const handleClick = () => onSelect?.(msg);
  const handleReact = (emoji) => onReact?.(msg, emoji);
  const createdAt = msg.createdAt?.toDate?.();

  // Расшифровываем один раз на изменение текста — иначе CryptoJS работает
  // на каждый рендер каждого пузыря
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

  return (
    <>
      <div className={`flex mt-4 mb-0 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
        <div className={`flex max-w-[70%] flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
          <div
            className={`rounded-lg px-4 py-2 shadow-sm ${
              isCurrentUser
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-white text-gray-800 rounded-bl-none"
            }`}
            onClick={handleClick}
            title="Нажмите для действий"
          >
            {msg.replyTo && (
              <div
                className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${
                  isCurrentUser
                    ? "border-blue-200 bg-blue-400/40"
                    : "border-blue-400 bg-gray-100"
                }`}
              >
                <span
                  className={`block font-semibold ${
                    isCurrentUser ? "text-blue-50" : "text-blue-600"
                  }`}
                >
                  {msg.replyTo.senderName}
                </span>
                <span
                  className={`block truncate ${
                    isCurrentUser ? "text-blue-50/90" : "text-gray-500"
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
                className="rounded-md max-w-full h-auto mb-1 max-h-64 object-cover"
              />
            )}

            {decryptedText && <p className="text-sm">{decryptedText}</p>}

            <div className="flex items-center justify-between gap-2 mt-1">
              <p className={`text-[10px] ${isCurrentUser ? "text-blue-100" : "text-gray-400"}`}>
                {createdAt
                  ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "..."}
              </p>
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
                        ? "border-blue-300 bg-blue-100 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
      {isCurrentUser && isLatestReadOwnMessage && msg.status === "read" && (
        <div className="text-right text-[10px] text-black">Просмотрено</div>
      )}
    </>
  );
};

// memo: пузырь рендерится только когда меняются его собственные пропсы,
// а не на каждое обновление списка / печатает / онлайн-статус
export default memo(MessageBubble);
