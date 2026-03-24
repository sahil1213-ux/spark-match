import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { getCurrentUserId, getMatchesForUser, getUserById, UserProfile } from '@/lib/store';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

interface MatchRow {
  matchId: string;
  other: UserProfile;
}

export default function ChatList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const uid = getCurrentUserId();
      if (!uid) {
        setLoading(false);
        return;
      }
      const matches = await getMatchesForUser(uid);
      const resolved = await Promise.all(
        matches.map(async (m) => {
          const otherId = m.users.find((u: string) => u !== uid) || '';
          const other = await getUserById(otherId);
          return other ? { matchId: m.id, other } : null;
        })
      );
      setRows(resolved.filter(Boolean) as MatchRow[]);
      setLoading(false);
    };
    void run();
  }, []);

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">Chats</h1>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8">Loading matches...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold">No matches yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you match with someone, your chats will show up here.
            </p>
            <Button className="mt-4 w-full rounded-2xl gradient-coral" onClick={() => navigate('/home')}>
              <Heart className="mr-2 h-4 w-4" /> Go to Discover
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(({ matchId, other }) => (
              <button key={matchId} onClick={() => navigate(`/chat/${matchId}`)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 text-left">
                <div className="w-12 h-12 rounded-full gradient-coral flex items-center justify-center text-primary-foreground font-bold">{other.name[0]}</div>
                <div>
                  <p className="font-semibold text-sm">{other.name}</p>
                  <p className="text-xs text-muted-foreground">Tap to chat</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
