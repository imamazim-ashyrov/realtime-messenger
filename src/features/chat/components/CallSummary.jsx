const formatDuration = (sec) => {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Системное сообщение о звонке. Рендерится по центру, со значком трубки.
 * msg.callSummary = { status: "missed" | "rejected" | "completed", durationSeconds }
 * isCurrentUser означает «я был звонящим».
 */
const CallSummary = ({ msg, isCurrentUser }) => {
  const { status, durationSeconds } = msg.callSummary || {};
  const createdAt = msg.createdAt?.toDate?.();

  // Подбираем текст с учётом, кто я: звонящий или принимающий
  let label;
  let isDanger = false;
  if (status === "completed") {
    const dur = formatDuration(durationSeconds);
    label = dur ? `Звонок · ${dur}` : "Звонок";
  } else if (status === "rejected") {
    label = isCurrentUser ? "Звонок отклонён" : "Вы отклонили звонок";
    isDanger = true;
  } else {
    // missed
    label = isCurrentUser ? "Не отвечает" : "Пропущенный вызов";
    isDanger = true;
  }

  return (
    <div className="flex justify-center my-2">
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm ${
          isDanger
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
        </svg>
        <span className="font-medium">{label}</span>
        {createdAt && (
          <span className="text-[10px] opacity-70">
            {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
};

export default CallSummary;
