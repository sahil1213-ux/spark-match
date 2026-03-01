import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUserId, listMessages, sendMessage } from '@/lib/store';

interface MessageItem {
  id: string;
  senderId?: string;
  text?: string;
  [key: string]: unknown;
}

export default function Chat() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!matchId) return;
      const data = await listMessages(matchId);
      setMessages(data as MessageItem[]);
    };
    void load();
  }, [matchId]);

  const handleSend = async () => {
    const uid = getCurrentUserId();
    if (!uid || !matchId || !text.trim()) return;
    await sendMessage(matchId, uid, text.trim());
    setText('');
    const data = await listMessages(matchId);
    setMessages(data as MessageItem[]);
  };

  const uid = getCurrentUserId();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <button onClick={() => navigate('/chats')} className="text-sm text-muted-foreground">← Back</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`rounded-xl p-2 text-sm max-w-[75%] ${msg.senderId === uid ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 bg-card" placeholder="Type a message..." />
        <button onClick={handleSend} className="px-4 py-2 rounded-xl gradient-coral text-primary-foreground font-semibold text-sm">Send</button>
      </div>
    </div>
  );
}
