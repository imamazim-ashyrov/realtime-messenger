import { useEffect } from "react";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";

function App() {
  // Достаем нужные переменные и функцию из нашего глобального хранилища
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // Подписываемся на изменения состояния авторизации
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Firebase сам передаст сюда объект пользователя (или null, если он вышел)
      setUser(currentUser);
    });

    // Очистка при удалении компонента (важно для оптимизации!)
    return () => unsubscribe();
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
