import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
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
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-3xl border bg-card p-6 text-center max-w-xs">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Say hi to start the conversation.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === uid;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm max-w-[78%] break-words shadow-sm ${
                    mine
                      ? 'bg-[#DCF8C6] text-foreground rounded-br-md'
                      : 'bg-card border rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 bg-card" placeholder="Type a message..." />
        <button onClick={handleSend} className="px-4 py-2 rounded-xl gradient-coral text-primary-foreground font-semibold text-sm">Send</button>
      </div>
    </div>
  );
}
