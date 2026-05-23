import { useRef, useState } from "react";
import Avatar from "../../../components/Avatar";
import { uploadAvatarImage, updateUserProfile } from "../../../services/profileService";

const ProfileModal = ({ currentUser, onClose }) => {
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

  const handleRemoveAvatar = () => setAvatarUrl(null);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Профиль</h3>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Аватар + кнопки */}
          <div className="flex flex-col items-center gap-3">
            <Avatar url={avatarUrl} displayName={displayName} size="2xl" pulse={isUploading} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isUploading ? "Загрузка…" : avatarUrl ? "Сменить аватар" : "Загрузить аватар"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading || isSaving}
                  className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-200 dark:hover:bg-gray-700"
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

          {/* Имя */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
              Имя
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
              placeholder="Как вас называть"
            />
          </div>

          {/* Email (нередактируем) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
              Email
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
              {currentUser.email}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
