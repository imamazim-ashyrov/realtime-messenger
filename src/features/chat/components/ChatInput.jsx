import { useRef, useState } from "react";
import { enhanceMessageWithAI } from "../../../services/gemini";

const ChatInput = ({
  message,
  onMessageChange,
  onSend,
  onImageUpload,
  isUploading,
}) => {
  const fileInputRef = useRef(null);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Обработчик нажатия на кнопку ИИ
  const handleAiAction = async (action) => {
    if (!message.trim()) return;
    
    setIsAiLoading(true);
    setShowAiMenu(false); // Прячем меню, пока ИИ думает

    const enhancedText = await enhanceMessageWithAI(message, action);
    
    // Если ИИ не вернул ошибку, заменяем текст в инпуте
    if (!enhancedText.startsWith("Ошибка")) {
      onMessageChange(enhancedText);
    } else {
      alert("Сбой ИИ: Проверьте консоль или API ключ.");
    }
    
    setIsAiLoading(false);
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form className="flex space-x-2 items-center" onSubmit={onSend}>
        
        {/* Кнопка скрепки */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={onImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Прикрепить фото"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
          </svg>
        </button>

        {/* --- МАГИЧЕСКАЯ КНОПКА ИИ --- */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowAiMenu(!showAiMenu)}
            disabled={!message.trim() || isAiLoading} // Кнопка активна только если есть текст
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="ИИ-Редактор"
          >
            {isAiLoading ? (
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            )}
          </button>

          {/* Выпадающее меню ИИ */}
          {showAiMenu && (
            <div className="absolute bottom-full mb-3 left-0 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-56 z-50 overflow-hidden transform origin-bottom-left transition-all">
              <button type="button" onClick={() => handleAiAction('fix')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                ✍️ Исправить ошибки
              </button>
              <button type="button" onClick={() => handleAiAction('formal')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                👔 Сделать официально
              </button>
              <button type="button" onClick={() => handleAiAction('english')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                🇬🇧 Перевести (EN)
              </button>
            </div>
          )}
        </div>
        {/* --------------------------- */}

        {/* Инпут текста */}
        <input
          type="text"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Напишите сообщение..."
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
        />

        {/* Кнопка отправки */}
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Отправить
        </button>
      </form>
    </div>
  );
};

export default ChatInput;






