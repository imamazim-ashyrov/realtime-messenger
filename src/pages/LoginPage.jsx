import { useState } from "react";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Новое состояние: определяет, находимся ли мы в режиме регистрации
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // 1. Создаем пользователя в Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;

        // 2. Создаем документ в Firestore в коллекции 'users'
        // ID документа строго совпадает с ID пользователя (user.uid)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.email.split("@")[0], // Берем часть почты до @ как имя
          isOnline: true,
          createdAt: serverTimestamp(),
        });

        console.log("Успешная регистрация и сохранение в БД!");
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        console.log("Успешный вход!", userCredential.user);
      }
    } catch (error) {
      console.error("Ошибка авторизации:", error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Используем setDoc с опцией { merge: true }.
      // Если юзер новый - документ создастся. Если он уже был в базе - обновятся только поля ниже, без удаления старых данных.
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.photoURL || null,
          isOnline: true,
          lastLogin: serverTimestamp(),
        },
        { merge: true },
      );

      console.log("Успешный вход через Google и сохранение в БД!");
    } catch (error) {
      console.error("Ошибка входа через Google:", error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* Динамический заголовок */}
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          {isRegistering ? "Создать аккаунт" : "Вход в Мессенджер"}
        </h2>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Введите ваш email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Введите пароль"
              required
            />
          </div>

          {/* Динамическая кнопка */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold transition-colors hover:bg-blue-700"
          >
            {isRegistering ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center space-x-2 text-gray-400">
          <div className="h-px w-full bg-gray-300"></div>
          <span className="text-sm">или</span>
          <div className="h-px w-full bg-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          {/* Иконка Google (оставил для краткости) */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Продолжить с Google</span>
        </button>

        {/* Кнопка переключения режимов */}
        <p className="mt-6 text-center text-sm text-gray-600">
          {isRegistering ? "Уже есть аккаунт?" : "Нет аккаунта?"}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1 font-semibold text-blue-600 hover:underline"
          >
            {isRegistering ? "Войти" : "Зарегистрируйтесь"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
