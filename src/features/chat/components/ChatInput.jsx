import { useEffect, useRef, useState } from "react";
import { enhanceMessageWithAI } from "../../../services/ai";
import useVoiceRecorder from "../../../hooks/useVoiceRecorder";

const formatRecTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const ChatInput = ({
  message,
  onMessageChange,
  onSend,
  onImageUpload,
  isUploading,
  replyContext,
  onCancelReply,
  onSendVoice,
}) => {
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const recorder = useVoiceRecorder();
  const { isRecording, duration, error: recorderError, start, stop, cancel } = recorder;

  useEffect(() => {
    if (!messageInputRef.current) return;
    messageInputRef.current.style.height = "auto";
    const nextHeight = Math.min(messageInputRef.current.scrollHeight, 140);
    messageInputRef.current.style.height = `${nextHeight}px`;
  }, [message]);

  useEffect(() => {
    if (replyContext) messageInputRef.current?.focus();
  }, [replyContext]);

  const handleAiAction = async (action) => {
    if (!message.trim()) return;
    setIsAiLoading(true);
    setShowAiMenu(false);

    const enhancedText = await enhanceMessageWithAI(message, action);
    if (!enhancedText.startsWith("Ошибка")) {
      onMessageChange(enhancedText);
    } else {
      alert("Сбой ИИ: Проверьте консоль или API ключ.");
    }
    setIsAiLoading(false);
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  const handleStartRecording = async () => {
    await start();
  };

  const handleStopAndSend = async () => {
    const result = await stop();
    if (!result || !onSendVoice) return;
    setIsSendingVoice(true);
    try {
      await onSendVoice(result.blob, result.duration);
    } finally {
      setIsSendingVoice(false);
    }
  };

  // Режим записи — полностью заменяем поле ввода
  if (isRecording || isSendingVoice) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={isSendingVoice}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            aria-label="Отменить запись"
            title="Отменить"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>

          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-2.5">
            <span className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {isSendingVoice ? "Отправка…" : "Идёт запись"}
            </span>
            <span className="ml-auto font-mono text-sm text-red-700 dark:text-red-300 tabular-nums">
              {formatRecTime(duration)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStopAndSend}
            disabled={isSendingVoice}
            className="inline-flex h-10 w-10 shrink-0 rotate-180 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            aria-label="Остановить и отправить"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5L20.25 3 14.5 9.75 21 12 14.5 14.25 20.25 21 3 13.5 7.5 12 3 10.5z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const hasText = message.trim().length > 0;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      {replyContext && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-blue-600 dark:text-blue-400">
              Ответ для {replyContext.senderName}
            </span>
            <span className="block truncate text-sm text-gray-600 dark:text-gray-300">
              {replyContext.preview}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Отменить ответ"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {recorderError && (
        <div className="mb-2 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          {recorderError}
        </div>
      )}

      <form className="flex items-end gap-2" onSubmit={onSend}>
        <div className="flex flex-1 items-end gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40">
          <textarea
            ref={messageInputRef}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleMessageKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
            className="max-h-35 min-h-11 w-full resize-none overflow-y-auto bg-transparent py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
          />

          {/* ИИ-редактор */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowAiMenu(!showAiMenu)}
              disabled={!hasText || isAiLoading || isUploading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="ИИ-Редактор"
              title="ИИ-помощник"
            >
              {isAiLoading ? (
                <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              )}
            </button>

            {showAiMenu && (
              <div className="absolute bottom-full right-0 mb-3 w-56 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-xl z-50">
                <button type="button" onClick={() => handleAiAction("fix")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                  ✍️ Исправить ошибки
                </button>
                <button type="button" onClick={() => handleAiAction("formal")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                  👔 Сделать официально
                </button>
                <button type="button" onClick={() => handleAiAction("english")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                  🇬🇧 Перевести (EN)
                </button>
              </div>
            )}
          </div>

          {/* Картинка */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Прикрепить изображение"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        </div>

        {/* Если есть текст — отправляем его, иначе — кнопка микрофона */}
        {hasText ? (
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex rotate-180 h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            aria-label="Отправить сообщение"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5L20.25 3 14.5 9.75 21 12 14.5 14.25 20.25 21 3 13.5 7.5 12 3 10.5z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isUploading || !onSendVoice}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            aria-label="Записать голосовое"
            title="Записать голосовое"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>
        )}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={onImageUpload}
        />
      </form>

      {isUploading && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Идёт загрузка изображения, подождите...
        </div>
      )}
    </div>
  );
};

export default ChatInput;
