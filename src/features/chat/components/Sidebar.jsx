import { useEffect, useState } from "react";
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
import { getPeerUid } from "../../../utils/chat";
import useChats from "../../../hooks/useChats";
import NewChatModal from "./NewChatModal";

// Красивый вывод времени последнего сообщения
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
  if (diffInDays === 1) return "Вчера";
  if (diffInDays > 1 && diffInDays < 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

// Презентационный элемент списка — без собственных слушателей Firestore
const ChatListItem = ({ chat, currentUser, selectedUser, setSelectedUser, isOnline }) => {
  const peerUid = getPeerUid(chat.members, currentUser.uid);
  const peerInfo = chat.memberInfo?.[peerUid] || {};
  const unreadCount = chat.unread?.[currentUser.uid] || 0;

  // Превью последнего сообщения
  let previewText = "Нет сообщений";
  if (chat.lastMessage) {
    if (chat.lastMessage.type === "image") {
      previewText = "📷 Фотография";
    } else {
      previewText = decryptMessage(chat.lastMessage.text, chat.id);
    }
  }
  const sentByMe = chat.lastMessage?.senderId === currentUser.uid;

  const isSelected = selectedUser?.uid === peerUid;

  const handleClick = () => {
    setSelectedUser({
      uid: peerUid,
      displayName: peerInfo.displayName || "Пользователь",
      avatarUrl: peerInfo.avatarUrl || null,
    });
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center space-x-3 border-b border-gray-50 p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected ? "bg-blue-100" : "hover:bg-blue-50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
          {peerInfo.displayName?.charAt(0).toUpperCase() || "U"}
        </div>
        <div
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        ></div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {peerInfo.displayName || "Пользователь"}
          </h3>
          {chat.lastMessageAt && (
            <span
              className={`text-xs whitespace-nowrap ml-2 ${
                unreadCount > 0 ? "text-blue-500 font-bold" : "text-gray-400"
              }`}
            >
              {formatTime(chat.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center gap-2">
          <p
            className={`text-sm truncate ${
              unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"
            }`}
          >
            {sentByMe && <span className="text-gray-400">Вы: </span>}
            {previewText}
          </p>

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});
  const currentUser = useAuthStore((state) => state.user);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const selectedUser = useChatStore((state) => state.selectedUser);

  const { chats, isLoading } = useChats(currentUser.uid);

  const handleLogout = async () => {
    try {
      if (currentUser) {
        const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        await set(userStatusRef, {
          state: "offline",
          last_changed: rtdbServerTimestamp(),
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Ошибка при выходе:", error.message);
    }
  };

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
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-500">Вы вошли:</span>
          <h2 className="text-sm font-bold text-gray-800 truncate">
            {currentUser.displayName || currentUser.email}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChat(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
            title="Новый чат"
            aria-label="Новый чат"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs text-red-500 font-semibold hover:underline"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-400">Загрузка чатов…</p>
        ) : chats.length > 0 ? (
          chats.map((chat) => {
            const peerUid = getPeerUid(chat.members, currentUser.uid);
            const isUserOnline = userStatuses[peerUid]?.state === "online";
            return (
              <ChatListItem
                key={chat.id}
                chat={chat}
                currentUser={currentUser}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                isOnline={isUserOnline}
              />
            );
          })
        ) : (
          <div className="mt-10 px-6 text-center text-sm text-gray-400">
            <p>У вас пока нет чатов.</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-3 font-semibold text-blue-600 hover:underline"
            >
              Начать новый чат
            </button>
          </div>
        )}
      </div>

      {/* Модалка нового чата */}
      {showNewChat && (
        <NewChatModal
          currentUser={currentUser}
          onSelectUser={(user) => {
            setSelectedUser(user);
            setShowNewChat(false);
          }}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {/* Подтверждение выхода */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl text-center">
            <h3 className="mb-2 text-xl font-bold text-gray-900">Выход из аккаунта</h3>
            <p className="mb-6 text-sm text-gray-500">
              Вы уверены, что хотите выйти? Вам придется заново вводить email и пароль.
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
