import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theme"; // "light" | "dark"

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Фоллбэк: системная тема через prefers-color-scheme
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

/**
 * Глобальная тема: light | dark. Сохраняется в localStorage,
 * по умолчанию — системная.
 */
const useTheme = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Применяем класс .dark к <html> при изменении темы
  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
};

// Применяем сохранённую тему как можно раньше, до первого рендера,
// чтобы не было «вспышки» светлой темы при загрузке
export const initThemeEarly = () => {
  if (typeof window === "undefined") return;
  applyTheme(getInitialTheme());
};

export default useTheme;
