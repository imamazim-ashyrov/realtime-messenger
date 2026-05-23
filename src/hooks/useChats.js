import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

/**
 * Один слушатель на ВСЕ чаты пользователя.
 * Заменяет прежнюю схему «по слушателю на каждого пользователя» в сайдбаре:
 * было N слушателей и ~N*20 чтений — стало 1 слушатель и ~N чтений.
 */
const useChats = (currentUserUid) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserUid) return undefined;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", currentUserUid),
      orderBy("lastMessageAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(list);
        setIsLoading(false);
      },
      (error) => {
        console.error("Ошибка загрузки чатов:", error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUserUid]);

  return { chats, isLoading };
};

export default useChats;
