import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getCurrentUserProfile, uploadUserPhoto } from '@/lib/store';
import { Button } from '@/components/ui/button';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 5;

export default function PhotoUpload() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const profile = await getCurrentUserProfile();
      if (!profile) return;
      setPhotos((profile.photos ?? []).slice(0, MAX_PHOTOS));
    };
    void load();
  }, []);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uid = getCurrentUserId();
    if (!uid) return;

    let currentCount = photos.length;
    for (const file of Array.from(files)) {
      if (currentCount >= MAX_PHOTOS) break;
      const url = await uploadUserPhoto(uid, file);
      currentCount += 1;
      setPhotos((prev) => [...prev, url].slice(0, MAX_PHOTOS));
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
            <img key={index} src={photo} className="w-full aspect-[3/4] object-cover rounded-xl" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">{photos.length}/{MAX_PHOTOS} uploaded</p>

        <Button disabled={!canContinue} className="w-full gradient-coral" onClick={() => navigate('/home')}>
          Continue
        </Button>
      </div>
    </div>
  );
}
