import { useState, useRef, useCallback, useEffect } from "react";
import { useAuthStore } from "../../../store/authStore";
import { useChatStore } from "../../../store/chatStore";
import { rtdb } from "../../../services/firebase";
import { decryptMessage } from "../../../utils/crypto";
import { getPrivateChatId } from "../../../utils/chat";
import {
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  toggleReaction,
  deleteForEveryone,
  deleteForMe,
  resetUnread,
} from "../../../services/chatService";
import useChatMessages from "../../../hooks/useChatMessages";
import useTypingStatus from "../../../hooks/useTypingStatus";
import MessagesList from "./MessagesList";
import MessageActionsModal from "./MessageActionsModal";
import ChatInput from "./ChatInput";
import { onValue, ref } from "firebase/database";

const ChatWindow = ({ onStartCall }) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [partnerStatus, setPartnerStatus] = useState(null);
  const scrollRef = useRef(null);

  const currentUser = useAuthStore((state) => state.user);
  const selectedUser = useChatStore((state) => state.selectedUser);
  const resetChat = useChatStore((state) => state.resetChat);

  const chatId =
    selectedUser && currentUser
      ? getPrivateChatId(currentUser.uid, selectedUser.uid)
      : null;

  useEffect(() => {
    if (!selectedUser) return;

    const statusRef = ref(rtdb, `status/${selectedUser.uid}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setPartnerStatus(snapshot.val());
      } else {
        setPartnerStatus(null);
      }
    });

    return () => unsubscribe();
  }, [selectedUser]);

  // Сбрасываем счётчик непрочитанных при открытии чата
  useEffect(() => {
    if (chatId && currentUser?.uid) {
      resetUnread(chatId, currentUser.uid);
    }
  }, [chatId, currentUser?.uid]);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);

    // 1. Меньше минуты назад
    if (diffInMinutes < 1) return "был(а) только что";

    // Настройки для форматирования времени (только часы и минуты)
    const timeOptions = { hour: "2-digit", minute: "2-digit" };

    // 2. Текущие сутки (Сегодня) -> ПОКАЗЫВАЕМ ВРЕМЯ
    if (date.toDateString() === now.toDateString()) {
      // Можно написать "сегодня в HH:MM" или просто "в HH:MM", как в Telegram
      return `был(а) сегодня в ${date.toLocaleTimeString([], timeOptions)}`;
    }

    // 3. Вчера -> БЕЗ ВРЕМЕНИ
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "был(а) вчера";
    }

    // 4. Более старые даты -> БЕЗ ВРЕМЕНИ (формат ДД.ММ.ГГГГ)
    const dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
    return `был(а) ${date.toLocaleDateString([], dateOptions)}`;
  };

  const playSendSound = useCallback(() => {
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
    );
    // Браузер блокирует автоплей до первого user interaction — это норма, глотаем
    audio.play().catch(() => {});
  }, []);

  const { messages } = useChatMessages(chatId, currentUser?.uid);

  // Автоскролл вниз: при смене чата и при любом изменении длины списка
  // сообщений (своя отправка / входящее / первая загрузка чата).
  useEffect(() => {
    if (!scrollRef.current) return undefined;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
    return () => clearTimeout(timer);
  }, [chatId, messages.length]);

  const { isPartnerTyping, handleTyping, resetTyping } = useTypingStatus(
    chatId,
    currentUser?.uid,
    selectedUser?.uid,
  );

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    resetTyping();

    const text = message;
    const reply = replyingTo;
    setMessage("");
    setReplyingTo(null);

    try {
      await sendTextMessage({
        chatId,
        sender: currentUser,
        peer: selectedUser,
        text,
        replyTo: reply,
      });

      playSendSound();
    } catch (error) {
      console.error("Ошибка при отправке:", error);
    }
  };

  const handleToggleReaction = useCallback(
    async (targetMessage, emoji) => {
      if (!targetMessage) return;
      try {
        await toggleReaction({ message: targetMessage, emoji, uid: currentUser.uid });
      } catch (error) {
        console.error("Ошибка при изменении реакции:", error);
      }
    },
    [currentUser?.uid],
  );

  const handleSendVoice = async (blob, duration) => {
    if (!chatId) return;
    try {
      await sendVoiceMessage({
        chatId,
        sender: currentUser,
        peer: selectedUser,
        blob,
        duration,
      });
      playSendSound();
    } catch (error) {
      console.error("Ошибка при отправке голосового:", error);
      alert(error?.message || "Не удалось отправить голосовое сообщение.");
    }
  };

  const handleImageUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !chatId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        await sendImageMessage({
          chatId,
          sender: currentUser,
          peer: selectedUser,
          imageUrl: data.data.url,
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке картинки:", error);
    } finally {
      setIsUploading(false);
      if (input) {
        input.value = "";
      }
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!activeMessage) return;

    try {
      await deleteForEveryone(activeMessage.id);
      setActiveMessage(null);
    } catch (error) {
      console.error("Ошибка при удалении у всех:", error);
    }
  };

  const handleDeleteForMe = async () => {
    if (!activeMessage) return;

    try {
      await deleteForMe(activeMessage.id, currentUser.uid);
      setActiveMessage(null);
    } catch (error) {
      console.error("Ошибка при удалении у себя:", error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 md:flex">
        <div className="text-center">
          <div className="mb-4 flex justify-center text-6xl text-gray-300 dark:text-gray-700">
            💬
          </div>
          <span className="rounded-full bg-gray-200 dark:bg-gray-800 px-4 py-1 text-sm text-gray-500 dark:text-gray-400">
            Выберите пользователя, чтобы начать общение
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-gray-50 dark:bg-gray-950 md:flex-1">
      <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={resetChat}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Назад"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-lg font-semibold text-white shadow-md">
            {selectedUser.displayName?.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedUser.displayName}
            </h2>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                partnerStatus?.state === "online"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {partnerStatus?.state === "online"
                ? "в сети"
                : formatLastSeen(partnerStatus?.last_changed)}
            </span>
          </div>

          {/* Кнопка голосового звонка */}
          <button
            onClick={() => onStartCall?.(selectedUser)}
            disabled={!onStartCall}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Позвонить"
            title="Голосовой звонок"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <MessagesList
          messages={messages}
          currentUserUid={currentUser?.uid}
          chatId={chatId}
          onMessageClick={setActiveMessage}
          onToggleReaction={handleToggleReaction}
          scrollRef={scrollRef}
        />

        <div
          className={`absolute left-4 bottom-2 inline-flex justify-start transition-all duration-300 ease-in-out ${
            isPartnerTyping
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-3 w-fit">
            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {selectedUser?.displayName?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">печатает</span>
            <div className="flex space-x-1.5 items-center pt-1">
              <div
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <ChatInput
        message={message}
        onMessageChange={(value) => {
          setMessage(value);
          handleTyping();
        }}
        onSend={handleSendMessage}
        onImageUpload={handleImageUpload}
        onSendVoice={handleSendVoice}
        isUploading={isUploading}
        replyContext={
          replyingTo
            ? {
                senderName:
                  replyingTo.senderId === currentUser.uid
                    ? "Вы"
                    : selectedUser.displayName || "Собеседник",
                preview: replyingTo.text
                  ? decryptMessage(replyingTo.text, chatId)
                  : "📷 Фотография",
              }
            : null
        }
        onCancelReply={() => setReplyingTo(null)}
      />

      <MessageActionsModal
        message={activeMessage}
        currentUserUid={currentUser?.uid}
        onReact={(emoji) => {
          handleToggleReaction(activeMessage, emoji);
          setActiveMessage(null);
        }}
        onReply={() => {
          setReplyingTo(activeMessage);
          setActiveMessage(null);
        }}
        onDeleteForEveryone={handleDeleteForEveryone}
        onDeleteForMe={handleDeleteForMe}
        onCancel={() => setActiveMessage(null)}
      />
    </div>
  );
};

export default ChatWindow;
