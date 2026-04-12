import MessageBubble from "./MessageBubble";

const MessagesList = ({ messages, currentUserUid, chatId, onMessageClick, scrollRef }) => {
  const visibleMessages = messages.filter((msg) => !msg.deletedFor?.includes(currentUserUid));
  let latestReadOwnMessage = null;
  let latestReadOwnMessageIndex = -1;

  visibleMessages.forEach((msg, index) => {
    if (msg.senderId === currentUserUid && msg.status === "read") {
      latestReadOwnMessage = msg;
      latestReadOwnMessageIndex = index;
    }
  });

  const showReadReceipt = latestReadOwnMessageIndex >= 0
    && !visibleMessages
      .slice(latestReadOwnMessageIndex + 1)
      .some((msg) => msg.senderId !== currentUserUid);

  return (
    <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-80 pb-28">
      {visibleMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          chatId={chatId}
          isCurrentUser={msg.senderId === currentUserUid}
          isLatestReadOwnMessage={showReadReceipt && msg.id === latestReadOwnMessage?.id}
          onClick={() => onMessageClick(msg)}
        />
      ))}
      <div ref={scrollRef} />
    </div>
  );
};

export default MessagesList;
