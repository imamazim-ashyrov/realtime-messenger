import { decryptMessage } from "../../../utils/crypto";

const MessageBubble = ({
  msg,
  chatId,
  isCurrentUser,
  isLatestReadOwnMessage,
  onClick,
}) => {
  const createdAt = msg.createdAt?.toDate?.();

  return (
    <>
      <div
        className={`flex mt-4 mb-0 ${isCurrentUser ? "justify-end" : "justify-start"}`}
        onClick={onClick}
        title="Нажмите, чтобы удалить"
      >
        <div
          className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
            isCurrentUser
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-white text-gray-800 rounded-bl-none"
          }`}
        >
          {msg.imageUrl && (
            <img
              src={msg.imageUrl}
              alt="Вложение"
              className="rounded-md max-w-full h-auto mb-1 max-h-64 object-cover"
            />
          )}

          {msg.text && (
            <p className="text-sm">{decryptMessage(msg.text, chatId)}</p>
          )}

          <div className="flex items-center justify-between gap-2 mt-1">
            <p
              className={`text-[10px] ${
                isCurrentUser ? "text-blue-100" : "text-gray-400"
              }`}
            >
              {createdAt
                ? createdAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "..."}
            </p>
          </div>
        </div>
      </div>
      {isCurrentUser && isLatestReadOwnMessage && msg.status === "read" && (
        <div className="text-right text-[10px] text-black">Просмотрено</div>
      )}
    </>
  );
};

export default MessageBubble;
