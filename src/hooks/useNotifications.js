import { useCallback, useEffect, useState } from "react";

const isSupported = typeof window !== "undefined" && "Notification" in window;

/**
 * Обёртка над Web Notifications API.
 *  - permission: "default" | "granted" | "denied" | "unsupported"
 *  - requestPermission(): запрос разрешения (только из user-gesture)
 *  - notify(title, options): показать уведомление; возвращает Notification|null
 */
const useNotifications = () => {
  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : "unsupported",
  );

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return "denied";
    }
  }, []);

  const notify = useCallback((title, options = {}) => {
    if (!isSupported || Notification.permission !== "granted") return null;
    try {
      return new Notification(title, options);
    } catch {
      return null;
    }
  }, []);

  // Пользователь может поменять разрешение в настройках браузера — поллим
  useEffect(() => {
    if (!isSupported) return undefined;
    const id = setInterval(() => {
      const current = Notification.permission;
      setPermission((prev) => (prev === current ? prev : current));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return { permission, isSupported, requestPermission, notify };
};

export default useNotifications;
