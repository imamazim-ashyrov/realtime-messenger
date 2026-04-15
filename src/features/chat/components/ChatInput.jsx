import { useRef, useState } from "react";
import { enhanceMessageWithAI } from "../../../services/ai"; // Убедись, что путь правильный

const ChatInput = ({
  message,
  onMessageChange,
  onSend,
  onImageUpload,
  isUploading,
}) => {
  const fileInputRef = useRef(null);
  
  // Состояния для ИИ
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Обработчик ИИ-действий
  const handleAiAction = async (action) => {
    if (!message.trim()) return;
    
    setIsAiLoading(true);
    setShowAiMenu(false); // Прячем меню во время загрузки

    const enhancedText = await enhanceMessageWithAI(message, action);
    
    if (!enhancedText.startsWith("Ошибка")) {
      onMessageChange(enhancedText);
    } else {
      alert("Сбой ИИ: Проверьте консоль или API ключ.");
    }
    
    setIsAiLoading(false);
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form className="flex items-center gap-2" onSubmit={onSend}>
        
        {/* Контейнер ввода текста и кнопок */}
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100">
          <input
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Напишите сообщение..."
            className="min-h-11 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          
          {/* --- МАГИЧЕСКАЯ КНОПКА ИИ --- */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowAiMenu(!showAiMenu)}
              disabled={!message.trim() || isAiLoading || isUploading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-purple-500 hover:bg-purple-100 hover:text-purple-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="ИИ-Редактор"
              title="ИИ-помощник"
            >
              {isAiLoading ? (
                // Анимация загрузки (Spinner)
                <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
              ) : (
                // Иконка звездочек
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              )}
            </button>

            {/* Выпадающее меню ИИ */}
            {showAiMenu && (
              <div className="absolute bottom-full right-0 mb-3 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl z-50">
                <button type="button" onClick={() => handleAiAction('fix')} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700">
                  ✍️ Исправить ошибки
                </button>
                <button type="button" onClick={() => handleAiAction('formal')} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700">
                  👔 Сделать официально
                </button>
                <button type="button" onClick={() => handleAiAction('english')} className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700">
                  🇬🇧 Перевести (EN)
                </button>
              </div>
            )}
          </div>
          {/* --------------------------- */}

          {/* Кнопка скрепки */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Прикрепить изображение"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={isUploading || !message.trim()}
          className="inline-flex rotate-180 h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          aria-label="Отправить сообщение"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 10.5L20.25 3 14.5 9.75 21 12 14.5 14.25 20.25 21 3 13.5 7.5 12 3 10.5z"
            />
          </svg>
        </button>

        {/* Скрытый инпут файла */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={onImageUpload}
        />
      </form>
      
      {isUploading && (
        <div className="mt-2 text-sm text-gray-500">
          Идёт загрузка изображения, подождите...
        </div>
      )}
    </div>
  );
};

export default ChatInput;