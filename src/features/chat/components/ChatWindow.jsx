import { useState, useCallback, useEffect, useMemo } from "react";
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
} from "../../../services/chatService";
import useChatMessages from "../../../hooks/useChatMessages";
import useTypingStatus from "../../../hooks/useTypingStatus";
import MessagesList from "./MessagesList";
import MessageActionsModal from "./MessageActionsModal";
import ChatInput from "./ChatInput";
import Avatar from "../../../components/Avatar";
import { onValue, ref } from "firebase/database";

const ChatWindow = ({ onStartCall }) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [partnerStatus, setPartnerStatus] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);

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

  // Сброс unread.{me} происходит внутри useChatMessages: когда подписка
  // приносит сообщения с status="sent" от собеседника, тот же batch и
  // помечает их read, и обнуляет unread.{me}. Отдельный resetUnread тут
  // создавал бы лишний параллельный write по chat-документу.

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

  // Слияние подтверждённых (Firestore) и оптимистичных (локальных) сообщений.
  // Дедуп по clientId: когда сабскрипшен принёс наше же сообщение, локальное
  // pending становится дублем и пропадает из списка.
  const realClientIds = useMemo(
    () => new Set(messages.map((m) => m.clientId).filter(Boolean)),
    [messages],
  );
  // Render-time GC для pendingMessages — без setState внутри useEffect.
  const stillPending = pendingMessages.filter(
    (p) => p.chatId === chatId && !realClientIds.has(p.clientId),
  );
  if (stillPending.length !== pendingMessages.length) {
    setPendingMessages(stillPending);
  }
  const mergedMessages = useMemo(() => {
    if (stillPending.length === 0) return messages;
    return [...messages, ...stillPending].sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
      const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
      return ta - tb;
    });
  }, [messages, stillPending]);

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

    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pending = {
      id: `pending-${clientId}`,
      clientId,
      chatId,
      senderId: currentUser.uid,
      text, // храним plaintext: decryptMessage сам видит отсутствие префикса и возвращает как есть
      createdAt: { toDate: () => new Date() },
      replyTo: reply
        ? {
            messageId: reply.id,
            text: reply.text || "",
            hasImage: !!reply.imageUrl,
            senderName:
              reply.senderId === currentUser.uid
                ? "Вы"
                : selectedUser.displayName || "Собеседник",
          }
        : undefined,
      _pending: true,
    };
    setPendingMessages((prev) => [...prev, pending]);

    try {
      await sendTextMessage({
        chatId,
        sender: currentUser,
        peer: selectedUser,
        text,
        replyTo: reply,
        clientId,
      });
      playSendSound();
    } catch (error) {
      console.error("Ошибка при отправке:", error);
      setPendingMessages((prev) =>
        prev.map((p) =>
          p.clientId === clientId ? { ...p, _pending: false, _failed: true } : p,
        ),
      );
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

  const handleImageFile = async (file) => {
    if (!file || !chatId) return;
    if (!file.type?.startsWith("image/")) return;

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
    }
  };

  const handleDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
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
      <div className="hidden flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 md:flex">
        <div className="text-center">
          <div className="mb-4 flex justify-center text-6xl text-slate-300 dark:text-slate-700">
            💬
          </div>
          <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-4 py-1 text-sm text-slate-500 dark:text-slate-400">
            Выберите пользователя, чтобы начать общение
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col bg-slate-50 dark:bg-slate-950 md:flex-1"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <button
          onClick={resetChat}
          className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Назад"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar
          url={selectedUser.avatarUrl}
          displayName={selectedUser.displayName}
          colorKey={selectedUser.uid}
          size="md"
          online={partnerStatus?.state === "online"}
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {selectedUser.displayName}
          </h2>
          {isPartnerTyping ? (
            <p className="flex items-center gap-1.5 text-xs leading-tight mt-0.5 text-blue-600 dark:text-blue-400">
              <span>печатает</span>
              <span className="flex gap-0.5 items-center pt-0.5">
                <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </p>
          ) : (
            <p
              className={`truncate text-xs leading-tight mt-0.5 ${
                partnerStatus?.state === "online"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {partnerStatus?.state === "online"
                ? "в сети"
                : formatLastSeen(partnerStatus?.last_changed) || "не в сети"}
            </p>
          )}
        </div>

        <button
          onClick={() => onStartCall?.(selectedUser)}
          disabled={!onStartCall}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Позвонить"
          title="Голосовой звонок"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.487 17.14l-4.065-3.696a1.001 1.001 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.86a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a.991.991 0 0 0 .648-.291l1.86-2.171a.997.997 0 0 0-.085-1.39z" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <MessagesList
          key={chatId}
          messages={mergedMessages}
          currentUserUid={currentUser?.uid}
          chatId={chatId}
          onMessageClick={setActiveMessage}
          onToggleReaction={handleToggleReaction}
        />

        {isDraggingFile && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
            <div className="rounded-2xl border-2 border-dashed border-blue-500 bg-white/90 dark:bg-slate-900/90 px-8 py-6 text-center shadow-xl">
              <svg className="mx-auto mb-2 h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-base font-semibold text-blue-600 dark:text-blue-300">
                Отпустите чтобы отправить фото
              </p>
            </div>
          </div>
        )}

      </div>

      <ChatInput
        message={message}
        onMessageChange={(value) => {
          setMessage(value);
          handleTyping();
        }}
        onSend={handleSendMessage}
        onImageFile={handleImageFile}
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
