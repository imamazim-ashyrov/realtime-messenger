import Sidebar from '../features/chat/components/Sidebar';
import ChatWindow from '../features/chat/components/ChatWindow';
import IncomingCallModal from '../features/chat/components/IncomingCallModal';
import ActiveCallOverlay from '../features/chat/components/ActiveCallOverlay';
import useCallManager from '../hooks/useCallManager';
import { useCallStore } from '../store/callStore';

const ChatPage = () => {
  const { startCall, acceptCall, rejectCall, endCall, toggleMute } = useCallManager();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const activeCall = useCallStore((s) => s.activeCall);
  const isMuted = useCallStore((s) => s.isMuted);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <ChatWindow onStartCall={startCall} />

      {/* Входящий показываем только если ещё не приняли */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {activeCall && (
        <ActiveCallOverlay
          call={activeCall}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEnd={endCall}
        />
      )}
    </div>
  );
};

export default ChatPage;
