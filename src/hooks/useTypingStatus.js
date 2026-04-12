import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, onDisconnect, set } from "firebase/database";
import { rtdb } from "../services/firebase";

const useTypingStatus = (chatId, currentUserUid, selectedUserUid) => {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const myTypingRef = useRef(null);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!chatId || !selectedUserUid) {
      setIsPartnerTyping(false);
      return undefined;
    }

    const partnerTypingRef = ref(rtdb, `typing/${chatId}/${selectedUserUid}`);
    return onValue(partnerTypingRef, (snapshot) => {
      setIsPartnerTyping(snapshot.val() === true);
    });
  }, [chatId, selectedUserUid]);

  useEffect(() => {
    if (!chatId || !currentUserUid) return undefined;

    myTypingRef.current = ref(rtdb, `typing/${chatId}/${currentUserUid}`);
    onDisconnect(myTypingRef.current).set(false).catch((error) => {
      console.error("Ошибка onDisconnect для статуса печати:", error);
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (myTypingRef.current) {
        set(myTypingRef.current, false).catch((error) => {
          console.error("Ошибка сброса статуса печати при размонтировании:", error);
        });
      }

      isTyping.current = false;
      myTypingRef.current = null;
    };
  }, [chatId, currentUserUid]);

  const handleTyping = useCallback(() => {
    if (!chatId || !currentUserUid || !myTypingRef.current) return;

    if (!isTyping.current) {
      set(myTypingRef.current, true).catch((error) => {
        console.error("Ошибка установки статуса печати:", error);
      });
      isTyping.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (myTypingRef.current) {
        set(myTypingRef.current, false).catch((error) => {
          console.error("Ошибка сброса статуса печати:", error);
        });
      }
      isTyping.current = false;
    }, 3000);
  }, [chatId, currentUserUid]);

  const resetTyping = useCallback(() => {
    if (!myTypingRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    set(myTypingRef.current, false).catch((error) => {
      console.error("Ошибка сброса статуса печати:", error);
    });
    isTyping.current = false;
  }, [chatId, currentUserUid]);

  return { isPartnerTyping, handleTyping, resetTyping };
};

export default useTypingStatus;
