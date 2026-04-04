import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { db } from '../../../services/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const ChatWindow = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null); // Для автопрокрутки вниз

  const currentUser = useAuthStore((state) => state.user);
  const selectedUser = useChatStore((state) => state.selectedUser);

  // Генерируем уникальный ID чата для двоих пользователей
  // Сортируем ID, чтобы он был одинаковым и у отправителя, и у получателя
  const chatId = selectedUser 
    ? [currentUser.uid, selectedUser.uid].sort().join('_') 
    : null;

  // 1. СЛУШАЕМ СООБЩЕНИЯ (Real-time)
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      
      // Автопрокрутка вниз при новом сообщении
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  // 2. ОТПРАВЛЯЕМ СООБЩЕНИЕ
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    const text = message;
    setMessage(''); // Мгновенно очищаем поле для лучшего UX

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        text: text,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Ошибка при отправке:", error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="mb-4 flex justify-center text-6xl text-gray-300">💬</div>
          <span className="rounded-full bg-gray-200 px-4 py-1 text-sm text-gray-500">
            Выберите пользователя, чтобы начать общение
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      {/* Шапка чата */}
      <div className="flex items-center space-x-3 border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
          {selectedUser.displayName?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-lg font-medium text-gray-800">{selectedUser.displayName}</h2>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-80">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
              msg.senderId === currentUser.uid 
                ? 'bg-blue-500 text-white rounded-br-none' 
                : 'bg-white text-gray-800 rounded-bl-none'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 text-right ${
                msg.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} /> 
      </div>

      {/* Ввод сообщения */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form className="flex space-x-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;