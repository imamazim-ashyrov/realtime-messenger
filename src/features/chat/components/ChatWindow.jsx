import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../../store/authStore";
import { useChatStore } from "../../../store/chatStore";
import { db } from "../../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

const ChatWindow = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isUploading, setIsUploading] = useState(false); // Состояние загрузки
  const [messageToDelete, setMessageToDelete] = useState(null); // Для хранения ID сообщения, которое хотим удалить
  const fileInputRef = useRef(null); // Ссылка на скрытый input
  const scrollRef = useRef(null); // Для автопрокрутки вниз
  const isFirstLoad = useRef(true);

  const currentUser = useAuthStore((state) => state.user);
  const selectedUser = useChatStore((state) => state.selectedUser);
  const resetChat = useChatStore((state) => state.resetChat);

  // Генерируем уникальный ID чата для двоих пользователей
  // Сортируем ID, чтобы он был одинаковым и у отправителя, и у получателя
  const chatId = selectedUser
    ? [currentUser.uid, selectedUser.uid].sort().join("_")
    : null;

  useEffect(() => {
    isFirstLoad.current = true;
  }, [chatId]);

  // 1. СЛУШАЕМ СООБЩЕНИЯ (Real-time)
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);

      // --- ЛОГИКА ЗВУКОВОГО УВЕДОМЛЕНИЯ ---
      if (isFirstLoad.current) {
        // Если это самая первая загрузка чата - просто молча показываем сообщения
        isFirstLoad.current = false;
      } else {
        // Если это НЕ первая загрузка, значит прилетело новое сообщение в реальном времени!
        const lastMessage = msgs[msgs.length - 1];

        // Проверяем: если сообщение существует и его отправил НЕ текущий пользователь
        if (lastMessage && lastMessage.senderId !== currentUser.uid) {
          // Создаем аудио (здесь я вставил прямую ссылку на приятный звук "дзынь")
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
          );
          // Пробуем проиграть звук (браузеры могут блокировать звук, если вкладка неактивна, поэтому ловим ошибку)
          audio
            .play()
            .catch((err) =>
              console.log(
                "Автовоспроизведение звука заблокировано браузером",
                err,
              ),
            );
        }
      }
      // ------------------------------------

      setTimeout(
        () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]); // Не забудь добавить currentUser.uid в зависимости

  // 2. ОТПРАВЛЯЕМ СООБЩЕНИЕ
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    const text = message;
    setMessage(""); // Мгновенно очищаем поле для лучшего UX

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        text: text,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Ошибка при отправке:", error);
    }
  };

  // 3. Отправка изображения через ImgBB
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
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
        // Сохраняем ссылку в БД
        await addDoc(collection(db, "messages"), {
          chatId,
          senderId: currentUser.uid,
          text: "",
          imageUrl: data.data.url, // Новое поле для картинки
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке картинки:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- ЛОГИКА УДАЛЕНИЯ СООБЩЕНИЙ ---
  const handleDeleteForEveryone = async () => {
    if (!messageToDelete) return;
    try {
      // Физически удаляем документ из базы
      await deleteDoc(doc(db, "messages", messageToDelete.id));
      setMessageToDelete(null); // Закрываем окно
    } catch (error) {
      console.error("Ошибка при удалении у всех:", error);
    }
  };

  const handleDeleteForMe = async () => {
    if (!messageToDelete) return;
    try {
      // Записываем ID текущего пользователя в черный список этого сообщения
      await updateDoc(doc(db, "messages", messageToDelete.id), {
        deletedFor: arrayUnion(currentUser.uid),
      });
      setMessageToDelete(null); // Закрываем окно
    } catch (error) {
      console.error("Ошибка при удалении у себя:", error);
    }
  };
  // ---------------------------------

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
    <div
      className={`flex-col bg-gray-50 ${!selectedUser ? "hidden md:flex" : "flex w-full"} md:flex-1`}
    >
      {/* Шапка чата */}
      <div className="flex items-center space-x-3 border-b border-gray-200 bg-white p-4 shadow-sm">
        <button
          onClick={resetChat}
          className="md:hidden mr-2 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg
            className="h-6 w-6"
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
        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
          {selectedUser.displayName?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-lg font-medium text-gray-800">
          {selectedUser.displayName}
        </h2>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-80">
        {messages
          .filter((msg) => !msg.deletedFor?.includes(currentUser.uid)) // Фильтруем сообщения, удаленные для текущего пользователя
          .map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === currentUser.uid ? "justify-end" : "justify-start"}`}
              onClick={() => setMessageToDelete(msg)}
              title="Нажмите, чтобы удалить"
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
                  msg.senderId === currentUser.uid
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                {/* Если в сообщении есть картинка - показываем её */}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Вложение"
                    className="rounded-md max-w-full h-auto mb-1 max-h-64 object-cover"
                  />
                )}

                {/* Если есть текст - показываем текст */}
                {msg.text && <p className="text-sm">{msg.text}</p>}
                <p
                  className={`text-[10px] mt-1 text-right ${
                    msg.senderId === currentUser.uid
                      ? "text-blue-100"
                      : "text-gray-400"
                  }`}
                >
                  {msg.createdAt?.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        <div ref={scrollRef} />
        
        {/* --- МОДАЛЬНОЕ ОКНО УДАЛЕНИЯ --- */}
        {messageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl text-center">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Что сделать с сообщением?
              </h3>
              <div className="flex flex-col space-y-3">
                {/* Кнопка "Удалить у всех" показывается ТОЛЬКО если это твое сообщение */}
                {messageToDelete.senderId === currentUser.uid && (
                  <button
                    onClick={handleDeleteForEveryone}
                    className="rounded-lg bg-red-100 py-2 font-medium text-red-600 hover:bg-red-200 transition-colors"
                  >
                    Удалить у всех
                  </button>
                )}

                <button
                  onClick={handleDeleteForMe}
                  className="rounded-lg bg-yellow-100 py-2 font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
                >
                  Удалить только у меня
                </button>

                <button
                  onClick={() => setMessageToDelete(null)}
                  className="rounded-lg bg-gray-100 py-2 font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ввод сообщения */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form className="flex space-x-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Отправить
          </button>
          {/* Скрытый инпут для выбора файла */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          {/* Кнопка скрепки */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg
              className="h-6 w-6"
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
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
