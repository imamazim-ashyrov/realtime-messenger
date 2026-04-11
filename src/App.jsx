import { useEffect } from "react";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import "./index.css";
import { rtdb } from "./services/firebase";
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";

function App() {
  // Достаем нужные переменные и функцию из нашего глобального хранилища
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    let rtdbUnsubscribe = null; // Для хранения функции отписки от RTDB
    
    // Подписываемся на изменения состояния авторизации
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Firebase сам передаст сюда объект пользователя (или null, если он вышел)
      setUser(currentUser);

      if (rtdbUnsubscribe) {
        rtdbUnsubscribe(); // Отписываемся от предыдущих слушателей RTDB, если они были
        rtdbUnsubscribe = null;
      }

      if (currentUser) {
        // --- ЛОГИКА СТАТУСОВ REALTIME DATABASE ---
        const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        const connectedRef = ref(rtdb, '.info/connected'); // Специальный путь Firebase для проверки соединения

        // Сохраняем функцию отписки
        rtdbUnsubscribe = onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            // Что записать, если связь оборвется (onDisconnect)
            const isOfflineForDatabase = {
              state: 'offline',
              last_changed: rtdbServerTimestamp(),
            };

            // Что записать, когда мы в сети
            const isOnlineForDatabase = {
              state: 'online',
              last_changed: rtdbServerTimestamp(),
            };

            // Если соединение разорвется, сервер САМ запишет isOffline
            onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
              // А пока мы здесь, ставим статус online
              set(userStatusRef, isOnlineForDatabase);
            });
          }
        });
      }
    });

    // Очистка при удалении компонента (важно для оптимизации!)
    return () => {
      unsubscribe();
      if (rtdbUnsubscribe) {
        rtdbUnsubscribe();
      }
    };
  }, [setUser]);

  // Пока Firebase проверяет, залогинен ли юзер, показываем загрузку
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-500">
          Проверка авторизации...
        </div>
      </div>
    );
  }

  // Если юзер есть — показываем заглушку чата, если нет — страницу логина
  return <div>{user ? <ChatPage /> : <LoginPage />}</div>;
}

export default App;
