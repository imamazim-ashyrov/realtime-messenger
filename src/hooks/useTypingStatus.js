import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, onDisconnect, set } from "firebase/database";
import { rtdb } from "../services/firebase";

const TYPING_TIMEOUT_MS = 3000;

const useTypingStatus = (chatId, currentUserUid, selectedUserUid) => {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const myTypingRef = useRef(null);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Слушаем статус печати собеседника
  useEffect(() => {
    if (!chatId || !selectedUserUid) return undefined;

    const partnerTypingRef = ref(rtdb, `typing/${chatId}/${selectedUserUid}`);
    const unsubscribe = onValue(partnerTypingRef, (snapshot) => {
      setIsPartnerTyping(snapshot.val() === true);
    });

    return () => {
      unsubscribe();
      setIsPartnerTyping(false);
    };
  }, [chatId, selectedUserUid]);

  // Регистрируем свой узел печати + чистим при размонтировании / смене чата
  useEffect(() => {
    if (!chatId || !currentUserUid) return undefined;

    const node = ref(rtdb, `typing/${chatId}/${currentUserUid}`);
    myTypingRef.current = node;
    onDisconnect(node).set(false).catch(() => {});

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      set(node, false).catch(() => {});
      isTyping.current = false;
      myTypingRef.current = null;
    };
  }, [chatId, currentUserUid]);

  const handleTyping = useCallback(() => {
    const node = myTypingRef.current;
    if (!node) return;

    if (!isTyping.current) {
      set(node, true).catch(() => {});
      isTyping.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      set(node, false).catch(() => {});
      isTyping.current = false;
    }, TYPING_TIMEOUT_MS);
  }, []);

  const resetTyping = useCallback(() => {
    const node = myTypingRef.current;
    if (!node) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    set(node, false).catch(() => {});
    isTyping.current = false;
  }, []);

  return { isPartnerTyping, handleTyping, resetTyping };
};

export default useTypingStatus;
