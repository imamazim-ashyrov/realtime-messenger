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
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    let rtdbUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (rtdbUnsubscribe) {
        rtdbUnsubscribe();
        rtdbUnsubscribe = null;
      }

      if (currentUser) {
        const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");

        rtdbUnsubscribe = onValue(connectedRef, (snap) => {
          if (snap.val() !== true) return;

          // onDisconnect срабатывает на сервере — даже если вкладка крашнется,
          // статус всё равно станет offline
          onDisconnect(userStatusRef)
            .set({ state: "offline", last_changed: rtdbServerTimestamp() })
            .then(() => {
              set(userStatusRef, {
                state: "online",
                last_changed: rtdbServerTimestamp(),
              });
            });
        });
      }
    });

    return () => {
      unsubscribe();
      rtdbUnsubscribe?.();
    };
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-xl font-semibold text-slate-500 dark:text-slate-400">
          Проверка авторизации...
        </div>
      </div>
    );
  }

  return user ? <ChatPage /> : <LoginPage />;
}

export default App;
