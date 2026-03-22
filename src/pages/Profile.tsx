import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Edit2, Eye, Heart, Lock, MapPin, Settings, Shield, Sparkles, Star, CircleHelp, LogOut } from 'lucide-react';
import { getCurrentUserProfile, logout, saveProfileBio, UserProfile } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';

const premiumCards = [
  { name: 'Gold', subtitle: 'More matches', icon: Crown },
  { name: 'Silver', subtitle: 'Stand out faster', icon: Star },
  { name: 'Platinum', subtitle: 'Top-tier visibility', icon: Sparkles },
  { name: 'Boost', subtitle: 'Be seen now', icon: Heart },
];

const optionItems = [
  { label: 'Preferences', icon: Heart, action: 'filters' as const },
  { label: 'Privacy', icon: Shield, action: 'privacy' as const },
  { label: 'Help', icon: CircleHelp, action: 'help' as const },
  { label: 'Logout', icon: LogOut, action: 'logout' as const },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  useEffect(() => {
    const run = async () => {
      const me = await getCurrentUserProfile();
      if (!me) return navigate('/login');
      setUser(me);
      setBio(me.bio);
    };
    void run();
  }, [navigate]);

  const locationText = useMemo(() => user?.city || 'Location not set', [user?.city]);
  const avatar = user?.photos?.[0] ?? null;
  const stats = useMemo(() => ([
    { label: 'Profile Views', value: user ? Math.max(12, user.age * 2) : 0, icon: Eye },
    { label: 'Likes', value: user ? Math.max(8, user.photos.length * 6) : 0, icon: Heart },
    { label: 'Matches', value: user ? Math.max(3, user.photos.length * 2) : 0, icon: Sparkles },
  ]), [user]);

  const save = async () => {
    if (!user) return;
    await saveProfileBio(user.id, bio);
    setUser({ ...user, bio });
    setEditingBio(false);
  };

  const out = async () => {
    await logout();
    navigate('/login');
  };

  const handleOptionAction = async (action: (typeof optionItems)[number]['action']) => {
    if (action === 'filters') {
      navigate('/filters');
      return;
    }

    if (action === 'logout') {
      await out();
      return;
    }

    if (action === 'privacy') {
      navigate('/filters');
      return;
    }

    navigate('/chats');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-5 pt-6 space-y-6">
        <div className="rounded-[2rem] border bg-card px-5 py-6 text-center shadow-sm">
          <div className="relative mx-auto mb-4 h-28 w-28">
            {avatar ? (
              <img src={avatar} alt={user.name} className="h-full w-full rounded-full object-cover border-4 border-background shadow-md" />
            ) : (
              <div className="h-full w-full rounded-full gradient-coral text-primary-foreground flex items-center justify-center text-4xl font-heading border-4 border-background shadow-md">
                {user.name[0]}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/photos')}
              className="absolute bottom-1 right-1 rounded-full bg-background p-2 shadow-md border"
            >
              <Edit2 className="h-4 w-4 text-foreground" />
            </button>
          </div>

          <h1 className="text-2xl font-heading font-bold">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center justify-center gap-1">
            <span>{user.age}</span>
            <span>•</span>
            <MapPin className="h-3.5 w-3.5" />
            <span>{locationText}</span>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button className="rounded-2xl h-11 gradient-coral" onClick={() => setEditingBio((value) => !value)}>
              Edit Profile
            </Button>
            <Button variant="outline" className="rounded-2xl h-11" onClick={() => navigate('/filters')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Premium</h2>
            <span className="text-xs text-muted-foreground">Boost your profile</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {premiumCards.map(({ name, subtitle, icon: Icon }) => (
              <div key={name} className="min-w-[180px] rounded-3xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold">{name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                <Button className="mt-4 h-10 w-full rounded-2xl gradient-coral">Upgrade</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-background px-3 py-4 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">About</h2>
          {editingBio ? (
            <>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-24 w-full rounded-2xl border bg-background p-3 text-sm"
                placeholder="Tell people a little about yourself"
              />
              <Button onClick={save} className="mt-3 w-full rounded-2xl gradient-coral">Save Bio</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{bio || 'Add a short bio to tell people more about you.'}</p>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-2 shadow-sm">
          {optionItems.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={() => void handleOptionAction(action)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left ${label === 'Logout' ? 'text-destructive' : 'text-foreground'} hover:bg-background`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${label === 'Logout' ? 'bg-destructive/10' : 'bg-primary/10'} ${label === 'Logout' ? 'text-destructive' : 'text-primary'}`}>
                  {label === 'Privacy' ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-muted-foreground">›</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
