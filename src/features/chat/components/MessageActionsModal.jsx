const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MessageActionsModal = ({
  message,
  currentUserUid,
  onReact,
  onReply,
  onDeleteForEveryone,
  onDeleteForMe,
  onCancel,
}) => {
  if (!message) return null;

  const isOwnMessage = message.senderId === currentUserUid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center sm:pb-0"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Быстрые реакции */}
        <div className="flex items-center justify-around border-b border-slate-100 dark:border-slate-800 px-2 py-3">
          {QUICK_REACTIONS.map((emoji) => {
            const reacted = message.reactions?.[emoji]?.includes(currentUserUid);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125 ${
                  reacted
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                aria-label={`Реакция ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Действия */}
        <div className="flex flex-col p-3 space-y-2">
          <button
            type="button"
            onClick={onReply}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v4M3 10l6-6M3 10l6 6" />
            </svg>
            Ответить
          </button>

          {isOwnMessage && (
            <button
              type="button"
              onClick={onDeleteForEveryone}
              className="rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              Удалить у всех
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteForMe}
            className="rounded-lg bg-yellow-50 dark:bg-yellow-950/40 px-4 py-2.5 text-left text-sm font-medium text-yellow-700 dark:text-yellow-300 transition-colors hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
          >
            Удалить только у меня
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-center text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageActionsModal;
