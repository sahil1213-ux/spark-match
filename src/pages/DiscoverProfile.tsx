import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Heart, MapPin, ThumbsDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { DiscoverProfile, getDiscoverProfileById, markDiscoverProfileSwiped, swipeUser } from '@/lib/store';

export default function DiscoverProfilePage() {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const location = useLocation();
  const stateProfile = (location.state as { profile?: DiscoverProfile } | null)?.profile ?? null;
  const profile = useMemo(() => stateProfile ?? (profileId ? getDiscoverProfileById(profileId) : null), [profileId, stateProfile]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleAction = async (direction: 'left' | 'right') => {
    if (!profile) return;
    const swipeResult = markDiscoverProfileSwiped(profile.id, direction);
    if (!swipeResult.allowed) {
      setLimitMessage('Swipe limit reached. Please come back after 24 hours.');
      return;
    }
    try {
      await swipeUser(profile.id, direction);
    } catch (error) {
      console.error('Failed to save swipe from detail view', error);
    }
    navigate('/home', { replace: true });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background safe-top pb-24">
        <div className="max-w-sm mx-auto px-6 pt-6">
          <Button variant="ghost" onClick={() => navigate('/home')} className="mb-4 -ml-3">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <p className="text-muted-foreground">Profile not available in local storage.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const photos = profile.photos ?? [];

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/home')} className="-ml-3">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="overflow-x-auto rounded-3xl bg-card border">
          <div className="flex snap-x snap-mandatory overflow-x-auto">
            {(photos.length ? photos : [null]).map((photo, index) => (
              <div key={index} className="min-w-full snap-center aspect-[3/4] bg-secondary" onClick={() => setPhotoIdx(index)}>
                {photo ? (
                  <img src={photo} alt={`${profile.name} ${index + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full gradient-coral flex items-center justify-center text-6xl text-primary-foreground font-heading">
                    {profile.name[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
          {photos.length > 1 && (
            <div className="flex justify-center gap-1.5 py-3">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPhotoIdx(index)}
                  className={`h-1.5 rounded-full transition-all ${index === photoIdx ? 'w-6 bg-primary' : 'w-3 bg-muted'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-5 space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-heading font-bold">{profile.name}</h1>
              <span className="text-lg text-muted-foreground">{profile.age}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {profile.city || 'Location not set'}
            </p>
          </div>

          {profile.bio && (
            <div>
              <h2 className="text-sm font-semibold mb-1">Bio</h2>
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-2">Lifestyle</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p>Drink: {profile.drinking || '—'}</p>
              <p>Smoke: {profile.smoking || '—'}</p>
              <p>Exercise: {profile.exerciseFrequency || '—'}</p>
              <p>Sleep: {profile.sleepHabits || '—'}</p>
              <p>Eating: {profile.eatingPreference || '—'}</p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Additional Info</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p>Wants children: {profile.wantsChildren || '—'}</p>
              <p>Has children: {profile.hasChildren || '—'}</p>
              <p>Occupation: {profile.occupation || '—'}</p>
              <p>Height: {profile.height || '—'}</p>
            </div>
          </div>
        </div>

        {limitMessage && <p className="text-sm text-destructive">{limitMessage}</p>}

        <div className="flex gap-3 pb-4">
          <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => void handleAction('left')}>
            <ThumbsDown className="mr-2 h-4 w-4" /> Dislike
          </Button>
          <Button className="flex-1 rounded-2xl h-12 gradient-coral" onClick={() => void handleAction('right')}>
            <Heart className="mr-2 h-4 w-4" /> Like
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
