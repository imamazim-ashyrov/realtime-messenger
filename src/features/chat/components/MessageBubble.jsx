import { decryptMessage } from "../../../utils/crypto";

const MessageBubble = ({ msg, chatId, isCurrentUser, onClick }) => {
  const createdAt = msg.createdAt?.toDate?.();

  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
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
          {isCurrentUser && (
            <div className="flex gap-0.5">
              {msg.status === "read" ? (
                <>
                  <svg
                    className="w-3 h-3 text-blue-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                  <svg
                    className="w-3 h-3 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                </>
              ) : (
                <svg
                  className="w-3 h-3 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
