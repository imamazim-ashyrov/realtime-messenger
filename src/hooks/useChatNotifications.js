import { useEffect, useRef } from "react";
import { decryptMessage } from "../utils/crypto";
import { getPeerUid } from "../utils/chat";

const previewFor = (chat) => {
  const lm = chat.lastMessage;
  if (!lm) return "";
  if (lm.type === "image") return "📷 Фотография";
  if (lm.type === "audio") return "🎤 Голосовое сообщение";
  return decryptMessage(lm.text || "", chat.id);
};

/**
 * Следит за списком чатов и стреляет системным уведомлением, когда:
 *  - lastMessageAt у чата вырос (пришло новое сообщение),
 *  - отправитель — не я,
 *  - этот чат не открыт прямо сейчас на переднем плане.
 *
 * Первый снапшот не вызывает уведомления (иначе при загрузке выпрыгнут
 * уведомления по всем уже существующим чатам).
 */
const useChatNotifications = ({
  chats,
  currentUserUid,
  selectedPeerUid,
  notify,
  onOpenChat,
}) => {
  const lastSeenRef = useRef(null);

  useEffect(() => {
    if (!chats || !currentUserUid) return;

    const nextMap = {};
    chats.forEach((chat) => {
      nextMap[chat.id] = chat.lastMessageAt?.toMillis?.() ?? 0;
    });

    if (lastSeenRef.current === null) {
      lastSeenRef.current = nextMap;
      return;
    }

    chats.forEach((chat) => {
      const prevT = lastSeenRef.current[chat.id] ?? 0;
      const curT = nextMap[chat.id];
      const lm = chat.lastMessage;
      if (!lm || curT <= prevT) return;
      if (lm.senderId === currentUserUid) return;

      const peerUid = getPeerUid(chat.members, currentUserUid);
      const isOpenAndVisible =
        peerUid &&
        peerUid === selectedPeerUid &&
        document.visibilityState === "visible";
      if (isOpenAndVisible) return;

      const peerInfo = chat.memberInfo?.[peerUid] || {};
      const title = peerInfo.displayName || "Новое сообщение";
      const body = previewFor(chat);
      // tag = chat.id — уведомления из одного чата схлопываются
      const n = notify(title, { body, tag: chat.id, icon: "/favicon.svg" });
      if (n && onOpenChat) {
        n.onclick = () => {
          window.focus();
          onOpenChat({
            uid: peerUid,
            displayName: peerInfo.displayName || "Пользователь",
            avatarUrl: peerInfo.avatarUrl || null,
          });
          n.close();
        };
      }
    });

    lastSeenRef.current = nextMap;
  }, [chats, currentUserUid, selectedPeerUid, notify, onOpenChat]);
};

export default useChatNotifications;
