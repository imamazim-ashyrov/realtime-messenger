import { useEffect, useMemo, useState } from "react";
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
import NewChatModal from "./NewChatModal";
import SettingsModal from "./SettingsModal";
import Avatar from "../../../components/Avatar";

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

const ChatListItem = ({ chat, currentUser, selectedUser, setSelectedUser, isOnline, flash }) => {
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
        const iWasCaller = chat.lastMessage.senderId === currentUser.uid;
        if (chat.lastMessage.callStatus === "completed") {
          const d = chat.lastMessage.callDuration || 0;
          const dur = d > 0 ? ` · ${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, "0")}` : "";
          previewText = `📞 Звонок${dur}`;
        } else if (chat.lastMessage.callStatus === "rejected") {
          previewText = iWasCaller ? "📞 Отклонён" : "📞 Вы отклонили звонок";
        } else {
          previewText = iWasCaller ? "📞 Не дозвонился" : "📞 Пропущенный вызов";
        }
        break;
      }
      default:
        previewText = decryptMessage(chat.lastMessage.text, chat.id);
    }
  }
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
      className={`flex items-center space-x-3 border-b border-slate-50 dark:border-slate-800 p-3 sm:p-4 cursor-pointer transition-all ${
        isSelected
          ? "bg-blue-100 dark:bg-slate-800"
          : "hover:bg-blue-50 dark:hover:bg-slate-800/60"
      } ${flash ? "animate-chat-flash" : ""}`}
    >
      <Avatar
        url={peerInfo.avatarUrl}
        displayName={peerInfo.displayName}
        colorKey={peerUid}
        size="md"
        online={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {peerInfo.displayName || "Пользователь"}
          </h3>
          {chat.lastMessageAt && (
            <span
              className={`text-xs whitespace-nowrap ml-2 ${
                unreadCount > 0
                  ? "text-blue-500 dark:text-blue-400 font-bold"
                  : "text-slate-400 dark:text-slate-500"
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
                ? "text-slate-900 dark:text-slate-100 font-semibold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {sentByMe && <span className="text-slate-400 dark:text-slate-500">Вы: </span>}
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
  const [settingsTab, setSettingsTab] = useState(null); // null | "profile" | "appearance" | ...
  const [search, setSearch] = useState("");
  const [userStatuses, setUserStatuses] = useState({});
  const [flashChatId, setFlashChatId] = useState(null);
  const [prevTopChatId, setPrevTopChatId] = useState(null);

  const currentUser = useAuthStore((state) => state.user);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const selectedUser = useChatStore((state) => state.selectedUser);

  const { chats, isLoading } = useChats(currentUser.uid);
  const { notify } = useNotifications();

  useChatNotifications({
    chats,
    currentUserUid: currentUser.uid,
    selectedPeerUid: selectedUser?.uid,
    notify,
    onOpenChat: setSelectedUser,
  });

  // Подсветка верхнего чата при появлении нового сообщения. React-рекомендованный
  // паттерн «derive state from props»: setState во время рендера под условием.
  const topChatId = chats[0]?.id ?? null;
  if (topChatId !== prevTopChatId) {
    setPrevTopChatId(topChatId);
    if (prevTopChatId !== null && topChatId !== null) {
      setFlashChatId(topChatId);
    }
  }

  // Таймер сброса подсветки — setState уходит асинхронно через setTimeout.
  useEffect(() => {
    if (!flashChatId) return undefined;
    const t = setTimeout(() => setFlashChatId(null), 900);
    return () => clearTimeout(t);
  }, [flashChatId]);

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

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter((chat) => {
      const peerUid = getPeerUid(chat.members, currentUser.uid);
      const name = chat.memberInfo?.[peerUid]?.displayName || "";
      return name.toLowerCase().includes(term);
    });
  }, [chats, search, currentUser.uid]);

  return (
    <div
      className={`flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
        selectedUser ? "hidden md:flex" : "flex w-full"
      } md:w-1/3`}
    >
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4">
        <button
          onClick={() => setSettingsTab("profile")}
          className="flex items-center gap-3 min-w-0 cursor-pointer rounded-lg p-1 -m-1 transition hover:bg-slate-200 dark:hover:bg-slate-800"
          title="Профиль"
        >
          <Avatar
            url={currentUser.photoURL || currentUser.avatarUrl}
            displayName={currentUser.displayName || currentUser.email}
            colorKey={currentUser.uid}
            size="sm"
          />
          <div className="flex flex-col min-w-0 text-left">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {currentUser.displayName || currentUser.email}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {currentUser.email}
            </span>
          </div>
        </button>

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
            onClick={() => setSettingsTab("appearance")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-300 dark:hover:bg-slate-700"
            title="Настройки"
            aria-label="Настройки"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Поиск чатов */}
      <div className="border-b border-slate-100 dark:border-slate-800 p-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по чатам…"
            className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 pr-9 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Очистить поиск"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 border-b border-slate-50 dark:border-slate-800 p-3 sm:p-4"
              >
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
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
                flash={flashChatId === chat.id}
              />
            );
          })
        ) : chats.length > 0 ? (
          <p className="mt-10 px-6 text-center text-sm text-slate-400 dark:text-slate-500">
            По запросу «{search}» ничего не найдено
          </p>
        ) : (
          <div className="mt-10 px-6 text-center text-sm text-slate-400 dark:text-slate-500">
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

      {settingsTab && (
        <SettingsModal
          currentUser={currentUser}
          initialTab={settingsTab}
          onLogout={() => {
            setSettingsTab(null);
            setShowLogoutConfirm(true);
          }}
          onClose={() => setSettingsTab(null)}
        />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 shadow-xl text-center animate-modal-in">
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Выход из аккаунта
            </h3>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
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
                className="rounded-lg bg-slate-100 dark:bg-slate-800 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
