import { useEffect, useState } from "react";
import { db } from "../../../services/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuthStore } from "../../../store/authStore";
import { auth } from "../../../services/firebase";
import { signOut } from "firebase/auth";
import { useChatStore } from "../../../store/chatStore";

const Sidebar = () => {
  const [users, setUsers] = useState([]);
  const currentUser = useAuthStore((state) => state.user);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const selectedUser = useChatStore((state) => state.selectedUser); // Достаем и само значение для подсветки

  const handleLogout = async () => {
    try {
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

  return (
    <div className="flex w-1/3 flex-col border-r border-gray-200 bg-white">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Вы вошли:</span>
          <h2 className="text-sm font-bold text-gray-800 truncate">
            {currentUser.displayName || currentUser.email}
          </h2>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-red-500 font-semibold hover:underline"
        >
          Выйти
        </button>
      </div>

      {/* Список контактов */}
      <div className="flex-1 overflow-y-auto">
        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center space-x-3 border-b border-gray-50 p-4 cursor-pointer transition-colors ${
                selectedUser?.uid === user.uid
                  ? "bg-blue-100"
                  : "hover:bg-blue-50"
              }`}
            >
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user.displayName?.charAt(0).toUpperCase() || "U"}
                </div>
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="mt-10 text-center text-sm text-gray-400">
            Других пользователей пока нет
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
