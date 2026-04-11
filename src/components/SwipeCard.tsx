import { useRef, useState, useMemo } from 'react';
import { Heart, X } from 'lucide-react';
import { MatchResult } from '@/lib/store';
import { TraitKey, TRAITS, PersonalityScores } from '@/lib/scoring';

const TRAIT_BIOS: Record<TraitKey, string[]> = {
  openness: ['loves trying new things', 'enjoys creative ideas', 'always up for an adventure'],
  conscientiousness: ['stays on top of their goals', 'likes keeping things neat', 'plans everything ahead'],
  extraversion: ['loves hanging out with people', 'enjoys big social events', 'always ready to chat'],
  agreeableness: ['cares a lot about others', 'loves helping people out', 'always keeps things friendly'],
  neuroticism: ['thinks deeply about things', 'very in touch with feelings', 'cares a lot about details'],
};

function getPersonalityBio(scores?: Partial<Record<TraitKey, number>>) {
  if (!scores) return null;

  const ranked = [...TRAITS]
    .filter((t) => scores[t] != null)
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  if (ranked.length < 2) return null;

  const top = ranked[0];
  const second = ranked[1];

  const a = TRAIT_BIOS[top][0];
  const b = TRAIT_BIOS[second][1] ?? TRAIT_BIOS[second][0];
  const c = TRAIT_BIOS[top][2] ?? TRAIT_BIOS[top][1];

  return `${a}, ${b}, and ${c}`;
}

interface SwipeCardProps {
  user: MatchResult;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenProfile?: () => void;
}

export default function SwipeCard({ user, onSwipeLeft, onSwipeRight, onOpenProfile }: SwipeCardProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const photos = user.photos ?? [];
  const insights = useMemo(
    () => getPersonalityInsights(user.matchingScores, user.persona),
    [user.matchingScores, user.persona],
  );

  const handleStart = (clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    isHorizontal.current = null;
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (isHorizontal.current) {
      setDragX(dx);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragX > 100) {
      onSwipeRight();
    } else if (dragX < -100) {
      onSwipeLeft();
    }

    setDragX(0);
  };

  const rotation = dragX * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 400);

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: '3/4' }}>
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-card cursor-grab active:cursor-grabbing select-none"
        onClick={() => {
          if (!isDragging && Math.abs(dragX) < 10) onOpenProfile?.();
        }}
        style={{
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging ? 'none' : 'all 0.3s ease-out',
        }}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {dragX > 50 && (
          <div className="absolute top-8 left-6 z-20 px-4 py-2 border-4 border-primary text-primary font-bold text-2xl rounded-xl rotate-[-20deg]">
            LIKE
          </div>
        )}
        {dragX < -50 && (
          <div className="absolute top-8 right-6 z-20 px-4 py-2 border-4 border-destructive text-destructive font-bold text-2xl rounded-xl rotate-[20deg]">
            NOPE
          </div>
        )}

        <div className="relative w-full h-[55%] bg-secondary">
          {photos.length > 0 ? (
            <img src={photos[photoIdx]} alt={user.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full gradient-coral flex items-center justify-center">
              <span className="text-6xl font-heading text-primary-foreground">{user.name[0]}</span>
            </div>
          )}

          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIdx(i);
                  }}
                  className={`h-1 rounded-full transition-all ${
                    i === photoIdx ? 'w-6 bg-primary-foreground' : 'w-4 bg-primary-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-heading font-bold text-card-foreground">{user.name}</h2>
            <span className="text-lg text-muted-foreground">{user.age}</span>
            {user.distance != null && <span className="text-xs text-muted-foreground ml-auto">{Math.round(user.distance)} km</span>}
          </div>
          <p className="text-xs font-semibold text-primary">Compatibility: {Math.round(user.matchScore ?? 0)}%</p>

          {insights.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {insights.map((line, i) => (
                <p key={i} className="text-[11px] leading-tight text-muted-foreground italic">
                  {i === 0 ? '✨ ' : i === 2 ? '💕 ' : '🎯 '}{line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-6">
        <button
          onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
          className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
        >
          <X size={26} className="text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
          className="w-16 h-16 rounded-full gradient-coral flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
        >
          <Heart size={28} className="text-primary-foreground" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}