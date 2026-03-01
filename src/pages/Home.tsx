import { useEffect, useState } from 'react';
import { getMatches, swipeUser, MatchResult } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Heart, X } from 'lucide-react';

export default function Home() {
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const ranked = await getMatches();
      setCandidates(ranked);
    };
    void load();
  }, []);

  const current = candidates[0];

  const onSwipe = async (action: 'like' | 'dislike') => {
    if (!currentUser || !current) return;
    const result = await swipeUser(currentUser.id, current.id, action);
    if (result.isMatch) {
      setMatchPopup(current.name);
      setTimeout(() => setMatchPopup(null), 2000);
    }
    setCandidates(prev => prev.slice(1));
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">AI Ranked Matches</h1>
        {current ? <SwipeCard user={current} onSwipeLeft={() => onSwipe('dislike')} onSwipeRight={() => onSwipe('like')} /> : <p className="text-muted-foreground text-center py-20">No more profiles</p>}
      </div>
      {matchPopup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"><div className="gradient-coral rounded-3xl px-10 py-12 text-center"><h2 className="text-2xl font-heading font-bold text-primary-foreground mb-1">It's a Match!</h2><p className="text-primary-foreground/80">You and {matchPopup} liked each other</p></div></div>}
      <BottomNav />
    </div>
  );
}
