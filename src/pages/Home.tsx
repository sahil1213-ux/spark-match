import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDiscoverProfileById, getDiscoverProfiles, getDiscoverSwipeStatus, getLocalDiscoverSwipedCount, markDiscoverProfileSwiped, swipeUser, MatchResult } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import SwipeCard from '@/components/SwipeCard';
import { Button } from '@/components/ui/button';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [swipedCount, setSwipedCount] = useState(0);
  const [swipeRemaining, setSwipeRemaining] = useState(15);
  const [message, setMessage] = useState<string | null>(null);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCandidates = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const result = await getDiscoverProfiles({ forceRefresh });
      setCandidates(result.matches);
      setSwipedCount(getLocalDiscoverSwipedCount());
      setSwipeRemaining(getDiscoverSwipeStatus().remaining);
      setMessage(result.matches.length ? null : 'No profiles match your filters right now.');
    } catch (e) {
      console.error('Failed to load matches', e);
      setMessage('Could not load profiles right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const force = Boolean((location.state as { forceRefresh?: boolean } | null)?.forceRefresh);
    void loadCandidates(force);
  }, [location.state]);

  const current = candidates[0];

  const onSwipe = async (direction: 'left' | 'right') => {
    if (!current) return;

    const swipeResult = markDiscoverProfileSwiped(current.uid, direction);
    if (!swipeResult.allowed) {
      setMessage('Swipe limit reached. Please come back after 24 hours.');
      setSwipeRemaining(swipeResult.status.remaining);
      return;
    }

    setCandidates((prev) => prev.slice(1));
    setSwipedCount(getLocalDiscoverSwipedCount());
    setSwipeRemaining(swipeResult.status.remaining);

    try {
      const result = await swipeUser(current.uid, direction);
      if (result.matched) {
        setMatchPopup(current.name);
        setTimeout(() => setMatchPopup(null), 3000);
      }
    } catch (e) {
      console.error('Swipe failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-heading font-bold">Discover</h1>
          <span className="text-sm text-muted-foreground">{swipedCount} swiped · {swipeRemaining} left</span>
        </div>

        <Button variant="outline" className="w-full mb-4 rounded-xl" onClick={() => void loadCandidates(true)}>
          Refresh Profiles
        </Button>

        {message ? (
          <p className="text-muted-foreground text-center py-20">{message}</p>
        ) : loading ? (
          <p className="text-muted-foreground text-center py-20">Loading profiles...</p>
        ) : current ? (
          <SwipeCard user={current} onSwipeLeft={() => onSwipe('left')} onSwipeRight={() => onSwipe('right')} onOpenProfile={() => navigate(`/discover/${current.uid}`, { state: { profile: getDiscoverProfileById(current.uid) ?? undefined } })} />
        ) : (
          <p className="text-muted-foreground text-center py-20">
            No profiles left in your local list. Try refresh after some time.
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
