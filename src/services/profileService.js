import { auth, db } from "./firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuthStore } from "../store/authStore";

/**
 * Профиль пользователя:
 *   - аватар хранится на imgbb (так же, как сообщения-картинки),
 *   - users/{uid} держит displayName + avatarUrl,
 *   - chats.memberInfo.{uid} денормализован и должен обновляться вручную
 *     во всех чатах пользователя (иначе сайдбар покажет старый аватар).
 */

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

/** Загрузка картинки на imgbb. Возвращает прямую ссылку. */
export const uploadAvatarImage = async (fileOrBlob) => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) throw new Error("Не настроен VITE_IMGBB_API_KEY");

  const form = new FormData();
  form.append("image", fileOrBlob);

  const res = await fetch(`${IMGBB_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`imgbb upload failed: ${res.status}`);
  const data = await res.json();
  if (!data?.success) throw new Error("imgbb: пустой ответ");
  return data.data.url;
};

/**
 * Обновление профиля пользователя:
 *   1. users/{uid}.displayName + avatarUrl
 *   2. Firebase Auth (displayName + photoURL) — чтобы новые данные ушли
 *      в onAuthStateChanged-зависящие места
 *   3. authStore — чтобы UI сразу перерисовался без ожидания auth-события
 *   4. memberInfo во всех чатах пользователя (одна транзакция batch)
 */
export const updateUserProfile = async ({ uid, displayName, avatarUrl }) => {
  // Нормализуем поля. avatarUrl может быть null (значит — снять аватар).
  const userPatch = { uid, displayName, avatarUrl: avatarUrl || null };

  // 1. users/{uid}
  await setDoc(doc(db, "users", uid), userPatch, { merge: true });

  // 2. Firebase Auth — обновляем live-объект
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName,
      photoURL: avatarUrl || null,
    });
    // Зустанд держит ссылку на auth.currentUser; чтобы заставить ре-рендеры,
    // подменяем reference на новый объект с теми же полями
    useAuthStore.getState().setUser({
      ...auth.currentUser,
      displayName,
      photoURL: avatarUrl || null,
    });
  }

  // 3. memberInfo во всех чатах, где я участник
  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((chatDoc) => {
    batch.update(chatDoc.ref, {
      [`memberInfo.${uid}`]: { displayName, avatarUrl: avatarUrl || null },
    });
  });
  await batch.commit();
};
