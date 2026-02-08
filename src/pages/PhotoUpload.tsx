import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, X, ImageIcon } from 'lucide-react';

export default function PhotoUpload() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (photos.length >= 6) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(p => [...p, reader.result as string].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(p => p.filter((_, i) => i !== idx));
  };

  const handleContinue = () => {
    if (user) {
      setCurrentUser({ ...user, photos });
    }
    navigate('/home');
  };

  const slots = Array.from({ length: 6 }, (_, i) => photos[i] || null);

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-sm mx-auto px-6 py-8">
        <h1 className="text-2xl font-heading font-bold mb-1">Add Photos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload up to 6 photos — your first photo is your main one 📸
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {slots.map((photo, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl overflow-hidden relative border-2 border-dashed border-border bg-secondary/50"
            >
              {photo ? (
                <>
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/70 flex items-center justify-center"
                  >
                    <X size={14} className="text-background" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                      Main
                    </span>
                  )}
                </>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />

        <Button
          onClick={handleContinue}
          className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0"
        >
          {photos.length > 0 ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}
