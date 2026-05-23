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
import useNotifications from "../../../hooks/useNotifications";
import useChatNotifications from "../../../hooks/useChatNotifications";
import useTheme from "../../../hooks/useTheme";
import NewChatModal from "./NewChatModal";

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

const ChatListItem = ({ chat, currentUser, selectedUser, setSelectedUser, isOnline }) => {
  const peerUid = getPeerUid(chat.members, currentUser.uid);
  const peerInfo = chat.memberInfo?.[peerUid] || {};
  const unreadCount = chat.unread?.[currentUser.uid] || 0;

  let previewText = "Нет сообщений";
  if (chat.lastMessage) {
    switch (chat.lastMessage.type) {
      case "image":
        previewText = "📷 Фотография";
        break;
      case "audio":
        previewText = "🎤 Голосовое сообщение";
        break;
      case "call": {
        // sender в записи о звонке = тот, кто звонил
        const iWasCaller = chat.lastMessage.senderId === currentUser.uid;
        if (chat.lastMessage.callStatus === "completed") {
          const d = chat.lastMessage.callDuration || 0;
          const dur = d > 0 ? ` · ${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, "0")}` : "";
          previewText = `📞 Звонок${dur}`;
        } else if (chat.lastMessage.callStatus === "rejected") {
          previewText = iWasCaller ? "📞 Отклонён" : "📞 Вы отклонили звонок";
        } else {
          // missed
          previewText = iWasCaller ? "📞 Не дозвонился" : "📞 Пропущенный вызов";
        }
        break;
      }
      default:
        previewText = decryptMessage(chat.lastMessage.text, chat.id);
    }
  }
  // Префикс «Вы:» уместен только для обычных сообщений, не для системных звонков
  const sentByMe =
    chat.lastMessage?.senderId === currentUser.uid && chat.lastMessage?.type !== "call";
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
      className={`flex items-center space-x-3 border-b border-gray-50 dark:border-gray-800 p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected
          ? "bg-blue-100 dark:bg-gray-800"
          : "hover:bg-blue-50 dark:hover:bg-gray-800/60"
      }`}
    >
      <div className="relative shrink-0">
        <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
          {peerInfo.displayName?.charAt(0).toUpperCase() || "U"}
        </div>
        <div
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        ></div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {peerInfo.displayName || "Пользователь"}
          </h3>
          {chat.lastMessageAt && (
            <span
              className={`text-xs whitespace-nowrap ml-2 ${
                unreadCount > 0
                  ? "text-blue-500 dark:text-blue-400 font-bold"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {formatTime(chat.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center gap-2">
          <p
            className={`text-sm truncate ${
              unreadCount > 0
                ? "text-gray-900 dark:text-gray-100 font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {sentByMe && <span className="text-gray-400 dark:text-gray-500">Вы: </span>}
            {previewText}
          </p>

          {unreadCount > 0 && (
            <div className="shrink-0 bg-blue-500 text-white text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center shadow-sm">
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
  const { theme, toggleTheme } = useTheme();
  const {
    permission: notifPermission,
    isSupported: notifSupported,
    requestPermission: requestNotifPermission,
    notify,
  } = useNotifications();

  useChatNotifications({
    chats,
    currentUserUid: currentUser.uid,
    selectedPeerUid: selectedUser?.uid,
    notify,
    onOpenChat: setSelectedUser,
  });

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
      className={`flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${
        selectedUser ? "hidden md:flex" : "flex w-full"
      } md:w-1/3`}
    >
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950 p-4">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">Вы вошли:</span>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
            {currentUser.displayName || currentUser.email}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Переключатель темы */}
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition hover:bg-gray-200 dark:hover:bg-gray-700"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            aria-label="Переключить тему"
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17a5 5 0 110-10 5 5 0 010 10zm0 2a7 7 0 100-14 7 7 0 000 14zm-1-17h2v3h-2V2zm0 17h2v3h-2v-3zM2 11h3v2H2v-2zm17 0h3v2h-3v-2zM4.22 4.22l2.12 2.12-1.42 1.42-2.12-2.12 1.42-1.42zm14.14 14.14l2.12 2.12-1.42 1.42-2.12-2.12 1.42-1.42zm0-12.72l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12zM4.22 19.78l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {notifSupported && (
            <button
              onClick={requestNotifPermission}
              disabled={notifPermission === "denied"}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                notifPermission === "granted"
                  ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                  : notifPermission === "denied"
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={
                notifPermission === "granted"
                  ? "Уведомления включены"
                  : notifPermission === "denied"
                    ? "Уведомления заблокированы в настройках браузера"
                    : "Включить уведомления"
              }
              aria-label="Уведомления"
            >
              {notifPermission === "granted" ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22a2.5 2.5 0 0 0 2.45-2H9.55A2.5 2.5 0 0 0 12 22zM18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-2-2v-5a6 6 0 1 0-12 0v5l-2 2h5m6 0a3 3 0 1 1-6 0m6 0H9" />
                  {notifPermission === "denied" && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4l16 16" />
                  )}
                </svg>
              )}
            </button>
          )}
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
            className="text-xs text-red-500 dark:text-red-400 font-semibold hover:underline"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-400 dark:text-gray-500">
            Загрузка чатов…
          </p>
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
          <div className="mt-10 px-6 text-center text-sm text-gray-400 dark:text-gray-500">
            <p>У вас пока нет чатов.</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-3 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Начать новый чат
            </button>
          </div>
        )}
      </div>

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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-800 p-6 shadow-xl text-center">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              Выход из аккаунта
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
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
                className="rounded-lg bg-gray-100 dark:bg-gray-800 py-2 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
