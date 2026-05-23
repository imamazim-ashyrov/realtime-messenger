import { useEffect, useMemo, useState } from "react";
import { db } from "../../../services/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Avatar from "../../../components/Avatar";

/**
 * Модалка старта нового чата: список всех пользователей с поиском по имени.
 * Прежде этот запрос жил в Sidebar и грузился постоянно — теперь только при
 * открытии модалки, что снимает лишнюю нагрузку с основного экрана.
 */
const NewChatModal = ({ currentUser, onSelectUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("uid", "!=", currentUser.uid),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map((d) => d.data()));
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? users.filter((u) => (u.displayName || "").toLowerCase().includes(term))
      : users;
    return [...list].sort((a, b) =>
      (a.displayName || "").localeCompare(b.displayName || "", "ru"),
    );
  }, [users, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Новый чат</h3>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-100 dark:border-gray-800 p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((user) => (
              <button
                key={user.uid}
                onClick={() => onSelectUser(user)}
                className="flex w-full items-center gap-3 border-b border-gray-50 dark:border-gray-800 p-3 text-left transition-colors hover:bg-blue-50 dark:hover:bg-gray-800"
              >
                <Avatar url={user.avatarUrl} displayName={user.displayName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {user.displayName || "Пользователь"}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
              {search ? "Никого не найдено" : "Других пользователей пока нет"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
