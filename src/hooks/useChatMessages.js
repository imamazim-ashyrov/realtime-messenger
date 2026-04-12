import { useState, useEffect, useRef } from "react";
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

const useChatMessages = (chatId, currentUserUid, { onNewIncomingMessage } = {}) => {
  const [messages, setMessages] = useState([]);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !currentUserUid) {
      setMessages([]);
      return undefined;
    }

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

      if (!canceled) {
        setMessages(msgs.reverse());
      }

      if (messagesToMarkAsRead.length > 0) {
        try {
          const batch = writeBatch(db);
          messagesToMarkAsRead.forEach((msgId) => {
            const msgRef = doc(db, "messages", msgId);
            batch.update(msgRef, { status: "read" });
          });
          await batch.commit();
        } catch (error) {
          console.error("Ошибка при обновлении статуса:", error);
        }
      }

      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      } else {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.senderId !== currentUserUid) {
          onNewIncomingMessage?.(lastMessage);
        }
      }
    });

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [chatId, currentUserUid, onNewIncomingMessage]);

  return { messages };
};

export default useChatMessages;
