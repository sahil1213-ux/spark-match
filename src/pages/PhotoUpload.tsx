import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, uploadUserPhoto } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function PhotoUpload() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const uid = getCurrentUserId();
    if (!uid) return;
    for (const file of Array.from(files)) {
      if (photos.length >= 6) break;
      const url = await uploadUserPhoto(uid, file);
      setPhotos(p => [...p, url].slice(0, 6));
    }
  };

  return <div className="min-h-screen bg-background safe-top"><div className="max-w-sm mx-auto px-6 py-8"><h1 className="text-2xl font-heading font-bold mb-4">Add Photos</h1><input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" /><button className="w-full p-4 rounded-xl bg-secondary mb-4" onClick={() => fileRef.current?.click()}>Upload Photo</button><div className="grid grid-cols-3 gap-2 mb-6">{photos.map((p, i) => <img key={i} src={p} className="w-full aspect-[3/4] object-cover rounded-xl" />)}</div><Button className="w-full gradient-coral" onClick={() => navigate('/home')}>Continue</Button></div></div>;
}
