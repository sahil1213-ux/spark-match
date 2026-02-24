import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getMatchesForUser, getUserById, MatchDoc, UserProfile } from '@/lib/store';
import BottomNav from '@/components/BottomNav';

export default function ChatList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Array<{ match: MatchDoc; other: UserProfile }>>([]);

  useEffect(() => {
    const run = async () => {
      const uid = getCurrentUserId();
      if (!uid) return;
      const matches = await getMatchesForUser(uid);
      const resolved = await Promise.all(matches.map(async (m) => {
        const otherId = m.users.find(u => u !== uid) || '';
        const other = await getUserById(otherId);
        return other ? { match: m, other } : null;
      }));
      setRows(resolved.filter(Boolean) as Array<{ match: MatchDoc; other: UserProfile }>);
    };
    void run();
  }, []);

  return <div className="min-h-screen bg-background safe-top pb-24"><div className="max-w-sm mx-auto px-6 pt-6"><h1 className="text-xl font-heading font-bold mb-6">Chats</h1><div className="space-y-2">{rows.map(({ match, other }) => <button key={match.id} onClick={() => navigate(`/chat/${match.id}`)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 text-left"><div className="w-12 h-12 rounded-full gradient-coral flex items-center justify-center text-primary-foreground font-bold">{other.name[0]}</div><p className="font-semibold text-sm">{other.name}</p></button>)}</div></div><BottomNav /></div>;
}
