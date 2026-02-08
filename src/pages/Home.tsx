import { useState, useEffect, useMemo } from 'react';
import { getCurrentUser, getAllUsers, getMatches, addMatch, getSwipedLeft, addSwipedLeft, getAge, getFilters } from '@/lib/store';
import { seedMockData } from '@/lib/mockData';
import SwipeCard from '@/components/SwipeCard';
import BottomNav from '@/components/BottomNav';
import { Heart } from 'lucide-react';

export default function Home() {
  const [cardIndex, setCardIndex] = useState(0);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);

  useEffect(() => { seedMockData(); }, []);

  const currentUser = getCurrentUser();
  const filters = getFilters();

  const candidates = useMemo(() => {
    if (!currentUser) return [];
    const matches = getMatches();
    const swiped = getSwipedLeft();
    const excluded = new Set([currentUser.id, ...matches, ...swiped]);

    return getAllUsers().filter(u => {
      if (excluded.has(u.id)) return false;
      const age = getAge(u.birthdate);
      if (age < filters.ageMin || age > filters.ageMax) return false;
      if (filters.gender !== 'Any' && u.gender !== filters.gender) return false;
      return true;
    });
  }, [currentUser, cardIndex, filters]);

  const current = candidates[0]; // Always show first remaining candidate

  const handleSwipeRight = () => {
    if (!current) return;
    addMatch(current.id);
    setMatchPopup(current.displayName);
    setTimeout(() => setMatchPopup(null), 2000);
    setCardIndex(i => i + 1);
  };

  const handleSwipeLeft = () => {
    if (!current) return;
    addSwipedLeft(current.id);
    setCardIndex(i => i + 1);
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg gradient-coral flex items-center justify-center">
            <Heart size={16} className="text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-xl font-heading font-bold">Discover</h1>
        </div>

        {current ? (
          <SwipeCard
            key={current.id}
            user={current}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart size={32} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-heading font-bold mb-2">No more profiles</h2>
            <p className="text-sm text-muted-foreground">
              Check back later or adjust your filters
            </p>
          </div>
        )}
      </div>

      {/* Match popup */}
      {matchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in">
          <div className="gradient-coral rounded-3xl px-10 py-12 text-center shadow-2xl">
            <Heart size={48} className="text-primary-foreground mx-auto mb-3" fill="currentColor" />
            <h2 className="text-2xl font-heading font-bold text-primary-foreground mb-1">It's a Match!</h2>
            <p className="text-primary-foreground/80">You and {matchPopup} liked each other</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
