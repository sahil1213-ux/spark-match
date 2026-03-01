import { useEffect, useState } from 'react';
import { getMatches, swipeUser, MatchResult } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import SwipeCard from '@/components/SwipeCard';

export default function Home() {
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const ranked = await getMatches();
        setCandidates(ranked);
      } catch (e) {
        console.error('Failed to load matches', e);
      }
    };
    void load();
  }, []);

  const current = candidates[0];

  const onSwipe = async (direction: 'left' | 'right') => {
    if (!current) return;
    try {
      await swipeUser(current.uid, direction);
    } catch (e) {
      console.error('Swipe failed', e);
    }
    setCandidates(prev => prev.slice(1));
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">AI Ranked Matches</h1>
        {current ? (
          <SwipeCard user={current} onSwipeLeft={() => onSwipe('left')} onSwipeRight={() => onSwipe('right')} />
        ) : (
          <p className="text-muted-foreground text-center py-20">No more profiles</p>
        )}
      </div>
      {matchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
          <div className="gradient-coral rounded-3xl px-10 py-12 text-center">
            <h2 className="text-2xl font-heading font-bold text-primary-foreground mb-1">It's a Match!</h2>
            <p className="text-primary-foreground/80">You and {matchPopup} liked each other</p>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
