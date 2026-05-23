import MessageBubble from "./MessageBubble";

const MessagesList = ({
  messages,
  currentUserUid,
  chatId,
  onMessageClick,
  onToggleReaction,
  scrollRef,
}) => {
  const visibleMessages = messages.filter(
    (msg) => !msg.deletedFor?.includes(currentUserUid),
  );

  // Самое последнее ПРОЧИТАННОЕ собственное сообщение, после которого нет
  // чужих ответов — под ним покажем «Просмотрено».
  let latestReadOwnId = null;
  let latestReadOwnIndex = -1;
  visibleMessages.forEach((msg, index) => {
    if (msg.senderId === currentUserUid && msg.status === "read") {
      latestReadOwnId = msg.id;
      latestReadOwnIndex = index;
    }
  });
  const showReadReceipt =
    latestReadOwnIndex >= 0 &&
    !visibleMessages
      .slice(latestReadOwnIndex + 1)
      .some((msg) => msg.senderId !== currentUserUid);

  return (
    <div className="absolute inset-0 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-80 dark:bg-none dark:bg-gray-950 dark:opacity-100 pb-28">
      {visibleMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          chatId={chatId}
          currentUserUid={currentUserUid}
          isCurrentUser={msg.senderId === currentUserUid}
          isLatestReadOwnMessage={showReadReceipt && msg.id === latestReadOwnId}
          onSelect={onMessageClick}
          onReact={onToggleReaction}
        />
      ))}
      <div ref={scrollRef} />
    </div>
  );
};

export default MessagesList;
