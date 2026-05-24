import { useEffect, useRef, useState } from "react";
import { enhanceMessageWithAI } from "../../../services/ai";
import useVoiceRecorder from "../../../hooks/useVoiceRecorder";
import EmojiPicker from "./EmojiPicker";

const formatRecTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const WaveformBars = ({ levels }) => (
  <div className="flex h-8 items-center gap-0.5">
    {levels.map((v, i) => (
      <span
        key={i}
        className="w-0.75 rounded-full bg-red-500/80"
        style={{ height: `${Math.max(6, v * 100)}%`, transition: "height 80ms linear" }}
      />
    ))}
  </div>
);

const ChatInput = ({
  message,
  onMessageChange,
  onSend,
  onImageFile,
  isUploading,
  replyContext,
  onCancelReply,
  onSendVoice,
}) => {
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const recorder = useVoiceRecorder();
  const { isRecording, duration, levels, error: recorderError, start, stop, cancel } = recorder;

  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [message]);

  useEffect(() => {
    if (replyContext) messageInputRef.current?.focus();
  }, [replyContext]);

  useEffect(() => {
    if (!showAiMenu && !showEmoji) return undefined;
    const onClick = (e) => {
      if (showAiMenu && !e.target.closest("[data-ai-menu]")) {
        setShowAiMenu(false);
      }
      if (showEmoji && !e.target.closest("[data-emoji-picker]") && !e.target.closest("[data-emoji-trigger]")) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showAiMenu, showEmoji]);

  useEffect(() => {
    if (!showAiMenu && !showEmoji) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAiMenu(false);
        setShowEmoji(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showAiMenu, showEmoji]);

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

  const insertAtCursor = (text) => {
    const el = messageInputRef.current;
    if (!el) {
      onMessageChange(message + text);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + text + message.slice(end);
    onMessageChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageFile) onImageFile(file);
    if (e.target) e.target.value = "";
  };

  const handlePaste = (e) => {
    if (!onImageFile || !e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type?.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          onImageFile(file);
          return;
        }
      }
    }
  };

  const handleStartRecording = async () => {
    setShowEmoji(false);
    setShowAiMenu(false);
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

  if (isRecording || isSendingVoice) {
    return (
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
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

          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-2">
            <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300 shrink-0">
              {isSendingVoice ? "Отправка…" : "Запись"}
            </span>
            <div className="flex-1 overflow-hidden">
              <WaveformBars levels={levels} />
            </div>
            <span className="font-mono text-sm text-red-700 dark:text-red-300 tabular-nums shrink-0">
              {formatRecTime(duration)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStopAndSend}
            disabled={isSendingVoice}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            aria-label="Отправить голосовое"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const hasText = message.trim().length > 0;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4">
      {recorderError && (
        <div className="mb-2 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          {recorderError}
        </div>
      )}

      <form className="flex items-end gap-2" onSubmit={onSend}>
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40">
          {replyContext && (
            <div className="flex items-start gap-2 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
              <div className="w-1 self-stretch rounded-full bg-blue-500" />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Ответ для {replyContext.senderName}
                </span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">
                  {replyContext.preview}
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelReply}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600"
                aria-label="Отменить ответ"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-end gap-1 px-2 py-1">
            <div className="relative">
              <button
                type="button"
                data-emoji-trigger
                onClick={() => {
                  setShowEmoji((v) => !v);
                  setShowAiMenu(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Эмодзи"
                title="Эмодзи"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <circle cx="9" cy="10" r="0.5" fill="currentColor" stroke="none" strokeWidth="2" />
                  <circle cx="15" cy="10" r="0.5" fill="currentColor" stroke="none" strokeWidth="2" />
                </svg>
              </button>

              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-3 z-50">
                  <EmojiPicker
                    onSelect={(emoji) => insertAtCursor(emoji)}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>

            <textarea
              ref={messageInputRef}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleMessageKeyDown}
              onPaste={handlePaste}
              placeholder="Напишите сообщение..."
              rows={1}
              className="max-h-35 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />

            <div className="relative" data-ai-menu>
              <button
                type="button"
                onClick={() => {
                  setShowAiMenu((v) => !v);
                  setShowEmoji(false);
                }}
                disabled={!hasText || isAiLoading || isUploading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="ИИ-помощник"
                title="ИИ-помощник"
              >
                {isAiLoading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                )}
              </button>

              {showAiMenu && (
                <div className="absolute bottom-full right-0 mb-3 w-56 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 shadow-xl z-50 animate-modal-in">
                  <button type="button" onClick={() => handleAiAction("fix")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                    ✍️ Исправить ошибки
                  </button>
                  <button type="button" onClick={() => handleAiAction("formal")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                    👔 Сделать официально
                  </button>
                  <button type="button" onClick={() => handleAiAction("english")} className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300">
                    🇬🇧 Перевести (EN)
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Прикрепить изображение"
              title="Изображение"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative h-11 w-11 shrink-0">
          {/* Микрофон — виден когда нет текста. type="button" чтобы не сабмитил. */}
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isUploading || !onSendVoice || hasText}
            aria-label="Записать голосовое"
            title="Записать голосовое"
            className={`absolute inset-0 inline-flex items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 ease-out hover:bg-blue-700 disabled:bg-blue-300 ${
              hasText
                ? "opacity-0 scale-75 rotate-90 pointer-events-none"
                : "opacity-100 scale-100 rotate-0"
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>

          {/* Отправить — виден когда есть текст. */}
          <button
            type="submit"
            disabled={isUploading || !hasText}
            aria-label="Отправить"
            className={`absolute inset-0 inline-flex items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 ease-out hover:bg-blue-700 disabled:bg-blue-300 ${
              hasText
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-75 -rotate-90 pointer-events-none"
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />
      </form>

      {isUploading && (
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Идёт загрузка изображения, подождите...
        </div>
      )}
    </div>
  );
};

export default ChatInput;
