import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  writeBatch,
} from "firebase/firestore";

const useChatMessages = (chatId, currentUserUid) => {
  // Храним сообщения вместе с их chatId, чтобы при переключении чата
  // не отрисовать данные старого чата до прихода первого снапшота нового.
  const [data, setData] = useState({ chatId: null, messages: [] });

  useEffect(() => {
    if (!chatId || !currentUserUid) return undefined;

    let canceled = false;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (canceled) return;

      const msgs = [];
      const messagesToMarkAsRead = [];

      snapshot.forEach((docSnap) => {
        const msgData = docSnap.data();
        msgs.push({ id: docSnap.id, ...msgData });

        if (msgData.senderId !== currentUserUid && msgData.status !== "read") {
          messagesToMarkAsRead.push(docSnap.id);
        }
      });

      setData({ chatId, messages: msgs.reverse() });

      if (messagesToMarkAsRead.length > 0) {
        try {
          const batch = writeBatch(db);
          messagesToMarkAsRead.forEach((msgId) => {
            batch.update(doc(db, "messages", msgId), { status: "read" });
          });
          // Раз входящие видны — мы в чате; обнуляем непрочитанные сразу,
          // чтобы бейдж не появлялся при сообщении в открытый чат.
          batch.update(doc(db, "chats", chatId), {
            [`unread.${currentUserUid}`]: 0,
          });
          await batch.commit();
        } catch (error) {
          console.error("Ошибка при обновлении статуса:", error);
        }
      }
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [chatId, currentUserUid]);

  const messages = data.chatId === chatId ? data.messages : [];
  return { messages };
};

export default useChatMessages;
