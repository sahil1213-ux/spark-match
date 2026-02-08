import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserById, getMessages, sendMessage, getChatId } from '@/lib/store';
import { ArrowLeft, Send } from 'lucide-react';

export default function Chat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const otherUser = userId ? getUserById(userId) : null;
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ReturnType<typeof getMessages>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatId = currentUser && userId ? getChatId(currentUser.id, userId) : '';

  useEffect(() => {
    if (chatId) {
      setMessages(getMessages(chatId));
    }
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentUser || !otherUser) return null;

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(currentUser.id, otherUser.id, text.trim());
    setMessages(getMessages(chatId));
    setText('');
  };

  return (
    <div className="h-screen flex flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate('/chats')} className="text-muted-foreground">
          <ArrowLeft size={22} />
        </button>
        {otherUser.photos[0] ? (
          <img src={otherUser.photos[0]} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full gradient-coral flex items-center justify-center text-primary-foreground text-sm font-bold">
            {otherUser.displayName[0]}
          </div>
        )}
        <span className="font-semibold text-sm">{otherUser.displayName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Say something nice to {otherUser.displayName} 💬
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.from === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'gradient-coral text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-10 rounded-full bg-secondary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-10 h-10 rounded-full gradient-coral flex items-center justify-center disabled:opacity-40"
          >
            <Send size={18} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
