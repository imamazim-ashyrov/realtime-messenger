import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../../../services/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuthStore } from "../../../store/authStore";
import { auth } from "../../../services/firebase";
import { signOut } from "firebase/auth";
import { useChatStore } from "../../../store/chatStore";
import { rtdb } from "../../../services/firebase";
import {
  ref,
  onValue,
  set,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { decryptMessage } from "../../../utils/crypto";

// Функция для красивого вывода времени последнего сообщения
const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.floor(
    (todayStart.getTime() - messageDayStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (diffInDays === 1) {
    return "Вчера";
  }

  if (diffInDays > 1 && diffInDays < 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

// Отдельный компонент для каждого пользователя в списке
const ChatListItem = ({
  user,
  currentUser,
  selectedUser,
  setSelectedUser,
  isOnline,
  onLastMessageUpdate,
}) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid || !user?.uid) return;

    const chatId = [currentUser.uid, user.uid].sort().join("_");

    // ОПТИМИЗАЦИЯ: Берем последние 20 сообщений, чтобы найти последнее и посчитать непрочитанные
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setLastMessage(null);
        setUnreadCount(0);
        return;
      }

      const docs = snapshot.docs.map((doc) => doc.data());
      const latestMsg = docs[0];

      // 1. Расшифровываем последнее сообщение для превью
      let previewText = "";
      if (latestMsg.text) previewText = decryptMessage(latestMsg.text, chatId);
      else if (latestMsg.imageUrl) previewText = "📷 Фотография";

      setLastMessage({ ...latestMsg, text: previewText });
      onLastMessageUpdate?.(user.uid, latestMsg.createdAt);

      // 2. Считаем сколько сообщений не от нас и еще не прочитаны
      const unread = docs.filter(
        (m) => m.senderId !== currentUser.uid && m.status !== "read",
      ).length;

      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [currentUser.uid, onLastMessageUpdate, user.uid]);

  const isSelected = selectedUser?.uid === user.uid;

  return (
    <div
      onClick={() => setSelectedUser(user)}
      className={`flex items-center space-x-3 border-b border-gray-50 p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected ? "bg-blue-100" : "hover:bg-blue-50"
      }`}
    >
      {/* Аватар и статус онлайна */}
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
          {user.displayName?.charAt(0).toUpperCase() || "U"}
        </div>
        {isOnline ? (
          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"></div>
        ) : (

          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-400"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Имя и время последнего сообщения */}
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {user.displayName}
          </h3>
          {lastMessage && (
            <span
              className={`text-xs whitespace-nowrap ml-2 ${unreadCount > 0 ? "text-blue-500 font-bold" : "text-gray-400"}`}
            >
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        {/* Текст сообщения, галочки и бейдж непрочитанных */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center min-w-0 space-x-1">
            {/* Если последнее сообщение отправил Я, показываем статус доставки (галочки) */}
            {lastMessage?.senderId === currentUser.uid && (
              <span className="flex-shrink-0 mr-0.5">
                {(!lastMessage.status || lastMessage.status === "sent") && (
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {lastMessage.status === "delivered" && (
                  <svg
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M22 10l-7.5 7.5L13 16"></path>
                  </svg>
                )}
                {lastMessage.status === "read" && (
                  <svg
                    className="w-4 h-4 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L7 17l-5-5"></path>
                    <path d="M22 10l-7.5 7.5L13 16"></path>
                  </svg>
                )}
              </span>
            )}

            {/* Текст превью сообщения. Жирный, если есть непрочитанные */}
            <p
              className={`text-sm truncate ${unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}
            >
              {lastMessage ? lastMessage.text : "Нет сообщений"}
            </p>
          </div>

          {/* Бейдж количества непрочитанных (как в WhatsApp) */}
          {unreadCount > 0 && (
            <div className="flex-shrink-0 bg-blue-500 text-white text-[11px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm">
              {unreadCount > 10 ? "10+" : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [users, setUsers] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState({});
  const currentUser = useAuthStore((state) => state.user);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const selectedUser = useChatStore((state) => state.selectedUser); // Достаем и само значение для подсветки

  const handleLastMessageUpdate = useCallback((uid, createdAt) => {
    const timestamp = createdAt?.toMillis
      ? createdAt.toMillis()
      : new Date(createdAt || 0).getTime();

    setLastMessageTimestamps((prev) => {
      if (prev[uid] === timestamp) return prev;
      return { ...prev, [uid]: timestamp || 0 };
    });
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const timeA = lastMessageTimestamps[a.uid] || 0;
      const timeB = lastMessageTimestamps[b.uid] || 0;

      if (timeA !== timeB) return timeB - timeA;
      return (a.displayName || "").localeCompare(b.displayName || "", "ru");
    });
  }, [lastMessageTimestamps, users]);

  const handleLogout = async () => {
    try {
      // 1. Принудительно ставим статус offline ПЕРЕД выходом
      if (currentUser) {
        const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        await set(userStatusRef, {
          state: "offline",
          last_changed: rtdbServerTimestamp(),
        });
      }
      // 2. Затем выходим из аккаунта
      await signOut(auth);
    } catch (error) {
      console.error("Ошибка при выходе:", error.message);
    }
  };

  useEffect(() => {
    // 1. Ссылка на коллекцию пользователей
    const usersRef = collection(db, "users");

    // 2. Создаем запрос: исключаем текущего пользователя из списка (самому себе писать не будем)
    const q = query(usersRef, where("uid", "!=", currentUser.uid));

    // 3. Подписываемся на обновления
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let userList = [];
      snapshot.forEach((doc) => {
        userList.push(doc.data());
      });
      setUsers(userList);
    });

    // Очистка слушателя при размонтировании
    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    const statusRef = ref(rtdb, "status");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserStatuses(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div
      className={`flex-col border-r border-gray-200 bg-white ${selectedUser ? "hidden md:flex" : "flex w-full"} md:w-1/3`}
    >
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Вы вошли:</span>
          <h2 className="text-sm font-bold text-gray-800 truncate">
            {currentUser.displayName || currentUser.email}
          </h2>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="text-xs text-red-500 font-semibold hover:underline"
        >
          Выйти
        </button>
      </div>

      {/* Список контактов */}
      <div className="flex-1 overflow-y-auto">
        {users.length > 0 ? (
          sortedUsers.map((user) => {
            const isUserOnline = userStatuses[user.uid]?.state === "online";

            return (
              <ChatListItem
                key={user.uid}
                user={user}
                currentUser={currentUser}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                isOnline={isUserOnline}
                onLastMessageUpdate={handleLastMessageUpdate}
              />
            );
          })
        ) : (
          <p className="mt-10 text-center text-sm text-gray-400">
            Других пользователей пока нет
          </p>
        )}
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ ВЫХОДА --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl text-center">
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Выход из аккаунта
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              Вы уверены, что хотите выйти? Вам придется заново вводить email и
              пароль.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
              >
                Да, выйти
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg bg-gray-100 py-2 font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
