import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserProfile, logout, saveProfileBio, UserProfile } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const run = async () => {
      const me = await getCurrentUserProfile();
      if (!me) return;
      setProfile(me);
      setBio(me.bio ?? '');
    };

    void run();
  }, [loading, user, navigate]);

  const save = async () => {
    if (!profile) return;
    await saveProfileBio(profile.id, bio);
    setProfile((prev) => (prev ? { ...prev, bio } : prev));
  };

  const out = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-4">{profile.name || 'Your Profile'}</h1>
        <p className="text-sm text-muted-foreground mb-2">{profile.age} · {profile.gender}</p>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full h-24 border rounded-xl p-3" />
        <Button onClick={save} className="w-full mt-3">Save Bio</Button>
        <Button onClick={out} variant="outline" className="w-full mt-3">Log Out</Button>
      </div>
      <BottomNav />
    </div>
  );
}
