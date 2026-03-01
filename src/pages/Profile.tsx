import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserProfile, logout, saveProfileBio, UserProfile } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const run = async () => {
      const me = await getCurrentUserProfile();
      if (!me) return navigate('/login');
      setUser(me);
      setBio(me.bio);
    };
    void run();
  }, [navigate]);

  const save = async () => {
    if (!user) return;
    await saveProfileBio(user.id, bio);
  };

  const out = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-4">{user.name}</h1>
        <p className="text-sm text-muted-foreground mb-2">{user.age} · {user.gender}</p>
        <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full h-24 border rounded-xl p-3 bg-card" />
        <Button onClick={save} className="w-full mt-3">Save Bio</Button>
        <Button onClick={out} variant="outline" className="w-full mt-3">Log Out</Button>
      </div>
      <BottomNav />
    </div>
  );
}
