import Sidebar from '../features/chat/components/Sidebar';
import ChatWindow from '../features/chat/components/ChatWindow';

const ChatPage = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default ChatPage;