import { useEffect } from "react";
import { playRingtone } from "../../../utils/callSounds";

/**
 * Полноэкранная модалка входящего звонка.
 * Рендерится глобально из ChatPage, когда в callStore появляется incomingCall.
 */
const IncomingCallModal = ({ call, onAccept, onReject }) => {
  // Рингтон — пока висит модалка. Если браузер блокирует автоплей
  // (нет user-gesture с момента загрузки), звука не будет — это норма.
  useEffect(() => {
    if (!call) return undefined;
    const stop = playRingtone();
    return stop;
  }, [call]);

  if (!call) return null;
  const name = call.callerInfo?.displayName || "Пользователь";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 border dark:border-gray-800 p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-white text-4xl font-bold shadow-lg animate-pulse">
          {initial}
        </div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Входящий звонок
        </p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {name}
        </h3>

        <div className="flex justify-around">
          <button
            onClick={onReject}
            className="flex flex-col items-center gap-2"
            aria-label="Отклонить"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700">
              <svg className="h-6 w-6 rotate-135" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
              </svg>
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-300">Отклонить</span>
          </button>

          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2"
            aria-label="Принять"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700 animate-pulse">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
              </svg>
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-300">Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
