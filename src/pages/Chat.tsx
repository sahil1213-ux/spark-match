import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUserId, listMessages, sendMessage, MessageDoc } from '@/lib/store';

export default function Chat() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const data = await listMessages(userId);
      setMessages(data);
    };
    void load();
  }, [userId]);

  const handleSend = async () => {
    const uid = getCurrentUserId();
    if (!uid || !userId || !text.trim()) return;
    await sendMessage(userId, uid, text.trim());
    setText('');
    const data = await listMessages(userId);
    setMessages(data);
  };

  return <div className="min-h-screen bg-background flex flex-col"><div className="px-4 py-3 border-b"><button onClick={() => navigate('/chats')}>Back</button></div><div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">{messages.map(msg => <div key={msg.id} className="bg-secondary rounded-xl p-2 text-sm">{msg.text}</div>)}</div><div className="p-3 border-t flex gap-2"><input value={text} onChange={e => setText(e.target.value)} className="flex-1 border rounded px-3" /><button onClick={handleSend}>Send</button></div></div>;
}
