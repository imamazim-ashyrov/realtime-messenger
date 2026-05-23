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
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // Документ пользователя — id строго совпадает с auth uid
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.email.split("@")[0],
          isOnline: true,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Неверный email или пароль.");
          break;
        case "auth/email-already-in-use":
          setError("Пользователь с таким email уже зарегистрирован.");
          break;
        case "auth/weak-password":
          setError("Пароль должен содержать не менее 6 символов.");
          break;
        case "auth/invalid-email":
          setError("Некорректный формат email.");
          break;
        default:
          setError("Произошла ошибка авторизации. Попробуйте еще раз.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      // merge: true — обновим только эти поля, существующие данные не затрём
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.photoURL || null,
          lastLogin: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      setError("Произошла ошибка при входе через Google. Попробуйте еще раз.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border dark:border-gray-800 p-8 shadow-xl">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
          {isRegistering ? "Создать аккаунт" : "Вход в Мессенджер"}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
              placeholder="Введите ваш email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
              placeholder="Введите пароль"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold transition-colors hover:bg-blue-700"
          >
            {isRegistering ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center space-x-2 text-gray-400 dark:text-gray-500">
          <div className="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
          <span className="text-sm">или</span>
          <div className="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          {isRegistering ? "Уже есть аккаунт?" : "Нет аккаунта?"}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isRegistering ? "Войти" : "Зарегистрируйтесь"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
