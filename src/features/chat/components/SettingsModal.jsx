import { useEffect, useRef, useState } from "react";
import Avatar from "../../../components/Avatar";
import useTheme from "../../../hooks/useTheme";
import useNotifications from "../../../hooks/useNotifications";
import { uploadAvatarImage, updateUserProfile } from "../../../services/profileService";

const TABS = [
  { id: "profile", label: "Профиль", icon: "👤" },
  { id: "appearance", label: "Внешний вид", icon: "🎨" },
  { id: "notifications", label: "Уведомления", icon: "🔔" },
  { id: "about", label: "О приложении", icon: "ℹ️" },
];

const ProfileTab = ({ currentUser, onClose }) => {
  const fileInputRef = useRef(null);
  const initialName = currentUser.displayName || currentUser.email?.split("@")[0] || "";
  const initialAvatar = currentUser.photoURL || currentUser.avatarUrl || null;

  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const hasChanges = displayName !== initialName || avatarUrl !== initialAvatar;
  const canSave = !!displayName.trim() && hasChanges && !isUploading && !isSaving;

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Можно загружать только изображения.");
      return;
    }
    setError("");
    setIsUploading(true);
    try {
      const url = await uploadAvatarImage(file);
      setAvatarUrl(url);
    } catch (err) {
      setError("Не удалось загрузить аватар: " + (err?.message || "ошибка"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError("");
    setIsSaving(true);
    try {
      await updateUserProfile({
        uid: currentUser.uid,
        displayName: displayName.trim(),
        avatarUrl,
      });
      onClose();
    } catch (err) {
      setError("Не удалось сохранить профиль: " + (err?.message || "ошибка"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Профиль</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Как вас увидят собеседники
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar
          url={avatarUrl}
          displayName={displayName}
          colorKey={currentUser.uid}
          size="xl"
          pulse={isUploading}
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSaving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isUploading ? "Загрузка…" : avatarUrl ? "Сменить" : "Загрузить"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              disabled={isUploading || isSaving}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Убрать
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFile}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Имя
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
          placeholder="Как вас называть"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <p className="text-sm text-slate-500 dark:text-slate-400 break-all">
          {currentUser.email}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isSaving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
};

const AppearanceTab = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Внешний вид</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Выберите комфортную для глаз тему
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "light", label: "Светлая", isActive: theme !== "dark" },
          { id: "dark", label: "Тёмная", isActive: theme === "dark" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              if (opt.isActive) return;
              toggleTheme();
            }}
            className={`rounded-xl border-2 p-4 text-left transition ${
              opt.isActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <div
              className={`mb-2 h-12 rounded-md ${
                opt.id === "light"
                  ? "bg-linear-to-br from-white to-slate-100 border border-slate-200"
                  : "bg-linear-to-br from-slate-800 to-slate-950 border border-slate-700"
              }`}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {opt.label}
              </span>
              {opt.isActive && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <polyline points="5 12 10 17 20 7" />
                  </svg>
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const NotificationsTab = () => {
  const { permission, isSupported, requestPermission } = useNotifications();
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Уведомления</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Браузерные пуши о новых сообщениях когда вкладка не активна
        </p>
      </div>

      {!isSupported ? (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 text-sm text-amber-700 dark:text-amber-300">
          Ваш браузер не поддерживает уведомления.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Push-уведомления
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {permission === "granted"
                ? "Включены. Браузер покажет уведомление при новом сообщении."
                : permission === "denied"
                  ? "Заблокированы в настройках браузера. Разрешите в адресной строке слева."
                  : "Не запрошены. Нажмите кнопку, чтобы включить."}
            </p>
          </div>
          <button
            type="button"
            onClick={requestPermission}
            disabled={permission === "denied" || permission === "granted"}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              permission === "granted"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default"
                : permission === "denied"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {permission === "granted" ? "Включены" : permission === "denied" ? "Заблокированы" : "Включить"}
          </button>
        </div>
      )}
    </div>
  );
};

const AboutTab = () => (
  <div className="space-y-5">
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">О приложении</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Реалтайм-мессенджер · ВКР проект
      </p>
    </div>

    <dl className="space-y-3">
      {[
        ["Версия", "0.5.0"],
        ["Стек", "React 19 · Vite · Tailwind 4 · Firebase"],
        ["Звонки", "WebRTC peer-to-peer + STUN (Google)"],
        ["Хранение фото", "imgbb · бесплатный план"],
        ["Голосовые", "MediaRecorder API · base64 в Firestore"],
      ].map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-b-0">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{k}</dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">{v}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const SettingsModal = ({ currentUser, initialTab = "profile", onLogout, onClose }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[80vh] max-h-[640px] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-xl flex animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Левая колонка — табы */}
        <aside className="w-56 shrink-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Настройки</h2>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          {onLogout && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Выйти
              </button>
            </div>
          )}
        </aside>

        {/* Правая колонка — контент */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {activeTab === "profile" && <ProfileTab currentUser={currentUser} onClose={onClose} />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
