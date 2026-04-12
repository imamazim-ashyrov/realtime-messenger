import { useState, useRef, useCallback, useEffect } from "react";
import { useAuthStore } from "../../../store/authStore";
import { useChatStore } from "../../../store/chatStore";
import { db, rtdb } from "../../../services/firebase";
import { encryptMessage } from "../../../utils/crypto";
import useChatMessages from "../../../hooks/useChatMessages";
import useTypingStatus from "../../../hooks/useTypingStatus";
import MessagesList from "./MessagesList";
import DeleteMessageModal from "./DeleteMessageModal";
import ChatInput from "./ChatInput";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { onValue, ref } from "firebase/database";

const ChatWindow = () => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [partnerStatus, setPartnerStatus] = useState(null);
  const scrollRef = useRef(null);

  const currentUser = useAuthStore((state) => state.user);
  const selectedUser = useChatStore((state) => state.selectedUser);
  const resetChat = useChatStore((state) => state.resetChat);

  const chatId =
    selectedUser && currentUser
      ? [currentUser.uid, selectedUser.uid].sort().join("_")
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

    audio.play().catch((err) => {
      console.log("Автовоспроизведение звука заблокировано браузером", err);
    });
  }, []);

  const handleIncomingMessage = useCallback(() => {
    setTimeout(
      () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }, []);

  const { messages } = useChatMessages(chatId, currentUser?.uid, {
    onNewIncomingMessage: handleIncomingMessage,
  });

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
    setMessage("");

    try {
      const encryptedText = encryptMessage(text, chatId);

      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        text: encryptedText,
        status: "sent",
        createdAt: serverTimestamp(),
      });

      playSendSound();
    } catch (error) {
      console.error("Ошибка при отправке:", error);
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
        await addDoc(collection(db, "messages"), {
          chatId,
          senderId: currentUser.uid,
          text: "",
          imageUrl: data.data.url,
          status: "sent",
          createdAt: serverTimestamp(),
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
    if (!messageToDelete) return;

    try {
      await deleteDoc(doc(db, "messages", messageToDelete.id));
      setMessageToDelete(null);
    } catch (error) {
      console.error("Ошибка при удалении у всех:", error);
    }
  };

  const handleDeleteForMe = async () => {
    if (!messageToDelete) return;

    try {
      await updateDoc(doc(db, "messages", messageToDelete.id), {
        deletedFor: arrayUnion(currentUser.uid),
      });
      setMessageToDelete(null);
    } catch (error) {
      console.error("Ошибка при удалении у себя:", error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center bg-gray-50 p-4 md:flex">
        <div className="text-center">
          <div className="mb-4 flex justify-center text-6xl text-gray-300">
            💬
          </div>
          <span className="rounded-full bg-gray-200 px-4 py-1 text-sm text-gray-500">
            Выберите пользователя, чтобы начать общение
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-gray-50 md:flex-1">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={resetChat}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
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

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-semibold text-white shadow-md">
            {selectedUser.displayName?.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {selectedUser.displayName}
            </h2>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                partnerStatus?.state === "online"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {partnerStatus?.state === "online"
                ? "в сети"
                : formatLastSeen(partnerStatus?.last_changed)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <MessagesList
          messages={messages}
          currentUserUid={currentUser?.uid}
          chatId={chatId}
          onMessageClick={setMessageToDelete}
          scrollRef={scrollRef}
        />

        <div
          className={`absolute left-4 bottom-2 inline-flex justify-start transition-all duration-300 ease-in-out ${
            isPartnerTyping
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100 flex items-center space-x-3 w-fit">
            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {selectedUser?.displayName?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-gray-500">печатает</span>
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
        isUploading={isUploading}
      />

      <DeleteMessageModal
        messageToDelete={messageToDelete}
        currentUserUid={currentUser?.uid}
        onDeleteForEveryone={handleDeleteForEveryone}
        onDeleteForMe={handleDeleteForMe}
        onCancel={() => setMessageToDelete(null)}
      />
    </div>
  );
};

export default ChatWindow;
