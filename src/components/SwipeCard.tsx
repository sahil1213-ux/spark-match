import { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { UserProfile } from '@/lib/store';

interface SwipeCardProps {
  user: UserProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function SwipeCard({ user, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div className="relative w-full max-w-sm mx-auto mt-2">
      <div className="bg-card rounded-3xl overflow-hidden shadow-xl border border-border min-h-[540px]">
        <div className="relative h-[360px] bg-secondary">
          {user.photos[photoIdx] ? <img src={user.photos[photoIdx]} alt={user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full gradient-coral flex items-center justify-center"><span className="text-6xl font-heading text-primary-foreground">{user.name[0]}</span></div>}
          {user.photos.length > 1 && <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">{user.photos.map((_, i) => <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }} className={`h-1 rounded-full ${i === photoIdx ? 'w-6 bg-primary-foreground' : 'w-4 bg-primary-foreground/50'}`} />)}</div>}
        </div>
        <div className="p-5"><div className="flex items-baseline gap-2"><h2 className="text-2xl font-heading font-bold">{user.name}</h2><span className="text-lg text-muted-foreground">{user.age}</span></div><p className="text-sm text-muted-foreground mt-2">{user.bio}</p></div>
      </div>
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-6">
        <button onClick={onSwipeLeft} className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg"><X size={26} className="text-muted-foreground" /></button>
        <button onClick={onSwipeRight} className="w-16 h-16 rounded-full gradient-coral flex items-center justify-center shadow-lg"><Heart size={28} className="text-primary-foreground" fill="currentColor" /></button>
      </div>
    </div>
  );
}
