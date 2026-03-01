import { useEffect, useState } from 'react';
import { getMatches, swipeUser, MatchResult } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import SwipeCard from '@/components/SwipeCard';

export default function Home() {
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [swipedCount, setSwipedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getMatches();
        setCandidates(result.matches);
        setSwipedCount(25 - result.remaining);
        if (result.message === 'no_more_cards_today') {
          setMessage('No More Cards for Today');
        } else if (result.message === 'no_profiles_for_priority_order') {
          setMessage('No profiles found for your priority order right now.');
        }
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
      const result = await swipeUser(current.uid, direction);
      setSwipedCount(25 - result.remaining);
      if (result.matched) {
        setMatchPopup(current.name);
        setTimeout(() => setMatchPopup(null), 3000);
      }
      if (result.remaining <= 0) {
        setMessage('No More Cards for Today');
      }
    } catch (e) {
      console.error('Swipe failed', e);
    }
    setCandidates((prev) => prev.slice(1));
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-heading font-bold">Discover</h1>
          <span className="text-sm text-muted-foreground">{swipedCount}/25 swiped</span>
        </div>
        {message ? (
          <p className="text-muted-foreground text-center py-20">{message}</p>
        ) : current ? (
          <SwipeCard user={current} onSwipeLeft={() => onSwipe('left')} onSwipeRight={() => onSwipe('right')} />
        ) : (
          <p className="text-muted-foreground text-center py-20">
            No candidates found nearby matching your top priorities. Try updating priorities or expanding filters.
          </p>
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
