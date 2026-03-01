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

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!current) return;
    const result = await swipeUser(current.uid, direction);
    setRemaining(result.remaining);
    setCandidates((prev) => prev.slice(1));
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <h1 className="text-xl font-heading font-bold mb-2">Recommended Matches</h1>
        {remaining !== null && <p className="text-sm text-muted-foreground mb-4">Swipes remaining: {remaining}</p>}
        {current ? (
          <div className="bg-card rounded-3xl p-5 border">
            <h2 className="text-2xl font-semibold">{current.name}, {current.age}</h2>
            <p className="text-sm mt-2">{current.bio}</p>
            <p className="text-sm text-muted-foreground mt-2">Distance: {current.distance.toFixed(1)} km</p>
            <p className="text-sm text-muted-foreground">Match score: {current.matchScore}</p>
            <div className="flex gap-4 mt-6">
              <button onClick={() => handleSwipe('left')} className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center"><X /></button>
              <button onClick={() => handleSwipe('right')} className="w-12 h-12 rounded-full gradient-coral text-primary-foreground flex items-center justify-center"><Heart fill="currentColor" /></button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-20">No more profiles in your queue</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
