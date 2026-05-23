import { db } from "./firebase";
import {
  collection,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from "firebase/firestore";
import { encryptMessage } from "../utils/crypto";

// Аудио кодируется в base64 data-URL и кладётся прямо в документ сообщения.
// Преимущества: ноль внешних сервисов и CORS, всё работает поверх существующих
// правил Firestore. Ограничение: документ Firestore ≤1 МБ, поэтому в
// useVoiceRecorder ограничиваем длительность 60 секундами.
const MAX_VOICE_DOC_BYTES = 900 * 1024; // запас до лимита Firestore в 1 MB

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Сервисный слой чата: вся запись в Firestore (сообщения + денормализованный
 * документ чата) собрана здесь, чтобы компоненты не знали деталей хранилища.
 */

// Нормализуем пользователя (auth-объект или документ Firestore) к виду memberInfo
const toMemberInfo = (u) => ({
  displayName: u.displayName || u.email?.split("@")[0] || "Пользователь",
  avatarUrl: u.photoURL || u.avatarUrl || null,
});

/**
 * Атомарно создаёт сообщение и обновляет родительский чат (lastMessage, unread).
 * Если чат ещё не существует — создаёт его в той же транзакции.
 */
const writeMessage = async ({ chatId, sender, peer, messageData, preview }) => {
  const chatRef = doc(db, "chats", chatId);

  await runTransaction(db, async (tx) => {
    const chatSnap = await tx.get(chatRef);
    const msgRef = doc(collection(db, "messages"));

    tx.set(msgRef, {
      chatId,
      senderId: sender.uid,
      status: "sent",
      createdAt: serverTimestamp(),
      ...messageData,
    });

    const lastMessage = {
      text: preview.text,
      type: preview.type,
      senderId: sender.uid,
    };

    if (!chatSnap.exists()) {
      tx.set(chatRef, {
        type: "private",
        members: [sender.uid, peer.uid],
        memberInfo: {
          [sender.uid]: toMemberInfo(sender),
          [peer.uid]: toMemberInfo(peer),
        },
        createdAt: serverTimestamp(),
        createdBy: sender.uid,
        lastMessage,
        lastMessageAt: serverTimestamp(),
        unread: { [sender.uid]: 0, [peer.uid]: 1 },
      });
    } else {
      tx.update(chatRef, {
        lastMessage,
        lastMessageAt: serverTimestamp(),
        [`unread.${peer.uid}`]: increment(1),
      });
    }
  });
};

/** Отправка текстового сообщения (текст шифруется ключом = chatId). */
export const sendTextMessage = async ({ chatId, sender, peer, text, replyTo }) => {
  const encryptedText = encryptMessage(text, chatId);
  const messageData = { text: encryptedText };
  if (replyTo) {
    messageData.replyTo = {
      messageId: replyTo.id,
      text: replyTo.text || "",
      hasImage: !!replyTo.imageUrl,
      senderName:
        replyTo.senderId === sender.uid
          ? "Вы"
          : peer.displayName || "Собеседник",
    };
  }

  await writeMessage({
    chatId,
    sender,
    peer,
    messageData,
    // В превью чата кладём тот же зашифрованный текст — расшифруем при отображении
    preview: { text: encryptedText, type: "text" },
  });
};

/** Отправка сообщения-картинки. */
export const sendImageMessage = async ({ chatId, sender, peer, imageUrl }) => {
  await writeMessage({
    chatId,
    sender,
    peer,
    messageData: { text: "", imageUrl },
    preview: { text: "", type: "image" },
  });
};

/**
 * Кодирует голосовое в base64 data-URL и отправляет сообщение.
 * @param {{ chatId, sender, peer, blob: Blob, duration: number }} args
 */
export const sendVoiceMessage = async ({ chatId, sender, peer, blob, duration }) => {
  const audioUrl = await blobToDataUrl(blob);
  if (audioUrl.length > MAX_VOICE_DOC_BYTES) {
    throw new Error("Голосовое слишком длинное — лимит примерно 60 секунд.");
  }

  await writeMessage({
    chatId,
    sender,
    peer,
    messageData: { text: "", audioUrl, audioDuration: duration },
    preview: { text: "", type: "audio" },
  });
};

/** Поставить/снять реакцию текущего пользователя. */
export const toggleReaction = async ({ message, emoji, uid }) => {
  if (!message) return;
  const reactedUsers = message.reactions?.[emoji] || [];
  const alreadyReacted = reactedUsers.includes(uid);

  await updateDoc(doc(db, "messages", message.id), {
    [`reactions.${emoji}`]: alreadyReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
};

/** Удалить сообщение у всех (только автор). */
export const deleteForEveryone = async (messageId) => {
  await deleteDoc(doc(db, "messages", messageId));
};

/** Скрыть сообщение только у себя. */
export const deleteForMe = async (messageId, uid) => {
  await updateDoc(doc(db, "messages", messageId), {
    deletedFor: arrayUnion(uid),
  });
};

/**
 * Обнулить счётчик непрочитанных для пользователя при открытии чата.
 * Если чата ещё нет (нет ни одного сообщения) — тихо игнорируем.
 */
export const resetUnread = async (chatId, uid) => {
  try {
    await updateDoc(doc(db, "chats", chatId), { [`unread.${uid}`]: 0 });
  } catch {
    // Чат ещё не создан — нечего обнулять
  }
};
