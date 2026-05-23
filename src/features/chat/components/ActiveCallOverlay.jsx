import { useEffect, useState } from "react";

const formatDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Полноэкранный оверлей активного звонка: имя собеседника, длительность,
 * микрофон, кнопка завершения.
 */
const ActiveCallOverlay = ({ call, isMuted, onToggleMute, onEnd }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!call) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [call]);

  if (!call) return null;

  const name = call.peer?.displayName || "Пользователь";
  const initial = name.charAt(0).toUpperCase();
  const isRinging = call.status === "ringing";
  const elapsed = isRinging ? 0 : Math.max(0, Math.floor((now - call.startedAt) / 1000));

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-between bg-gray-950 px-6 py-12 text-white">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className={`mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-5xl font-bold shadow-2xl ${
            isRinging ? "animate-pulse" : ""
          }`}
        >
          {initial}
        </div>
        <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">
          {isRinging ? "Вызов…" : "В разговоре"}
        </p>
        <h2 className="text-3xl font-bold mb-2">{name}</h2>
        {!isRinging && (
          <p className="font-mono text-lg text-gray-300 tabular-nums">
            {formatDuration(elapsed)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-8">
        <button
          onClick={onToggleMute}
          disabled={isRinging}
          className={`flex flex-col items-center gap-2 transition ${
            isRinging ? "opacity-40" : ""
          }`}
          aria-label={isMuted ? "Включить микрофон" : "Выключить микрофон"}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
              isMuted ? "bg-white text-gray-900" : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            {isMuted ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l4-4m0 4l-4-4" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </span>
          <span className="text-xs text-gray-400">{isMuted ? "Включить" : "Микрофон"}</span>
        </button>

        <button
          onClick={onEnd}
          className="flex flex-col items-center gap-2"
          aria-label="Завершить звонок"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700">
            <svg className="h-7 w-7 rotate-135" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
            </svg>
          </span>
          <span className="text-xs text-gray-400">Завершить</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;
