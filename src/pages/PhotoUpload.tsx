import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getCurrentUserProfile, saveUserPhotos } from '@/lib/store';
import { advanceOnboarding } from '@/components/RouteGuards';
import { Button } from '@/components/ui/button';
import { clearPhotoDrafts, convertFilesToDataUrls, getPhotoDrafts, savePhotoDrafts } from '@/lib/photoDrafts';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 5;

export default function PhotoUpload() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const uid = getCurrentUserId();
      const profile = await getCurrentUserProfile();
      if (!profile) return;

      const draftPhotos = uid ? await getPhotoDrafts(uid) : [];
      const nextPhotos = (draftPhotos.length > 0 ? draftPhotos : profile.photos ?? []).slice(0, MAX_PHOTOS);

      setPhotos(nextPhotos);

      if (uid && draftPhotos.length === 0 && nextPhotos.length > 0) {
        await savePhotoDrafts(uid, nextPhotos);
      }
    };
    void load();
  }, []);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uid = getCurrentUserId();
    if (!uid) return;

    setError(null);

    const remainingSlots = Math.max(0, MAX_PHOTOS - photos.length);
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const draftUrls = await convertFilesToDataUrls(selectedFiles);
    const nextPhotos = [...photos, ...draftUrls].slice(0, MAX_PHOTOS);

    setPhotos(nextPhotos);
    await savePhotoDrafts(uid, nextPhotos);
    e.target.value = '';
  };

  const handleContinue = async () => {
    const uid = getCurrentUserId();
    if (!uid || !canContinue || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveUserPhotos(uid, photos);
      await clearPhotoDrafts(uid);
      advanceOnboarding('/home', uid);
      navigate('/home', { replace: true, state: { onboardingTransition: true } });
    } catch (err) {
      console.error('Failed to save photos', err);
      setError('Unable to save your photos right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canContinue = photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-sm mx-auto px-6 py-8">
        <h1 className="text-2xl font-heading font-bold mb-1">Step 3: Upload Photos</h1>
        <p className="text-sm text-muted-foreground mb-4">Add at least {MIN_PHOTOS} photos (maximum {MAX_PHOTOS})</p>

        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <button className="w-full p-4 rounded-xl bg-secondary mb-4" onClick={() => fileRef.current?.click()}>
          Upload Photo
        </button>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo, index) => (
            <img key={index} src={photo} alt={`Uploaded profile photo ${index + 1}`} className="w-full aspect-[3/4] object-cover rounded-xl" loading="lazy" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">{photos.length}/{MAX_PHOTOS} uploaded</p>
        {error ? <p className="text-xs text-destructive mb-4">{error}</p> : null}

        <Button disabled={!canContinue || isSaving} className="w-full gradient-coral" onClick={handleContinue}>
          {isSaving ? 'Saving photos...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
