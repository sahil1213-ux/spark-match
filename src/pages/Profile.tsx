import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, logout, getAge } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Edit3, Check, X } from 'lucide-react';

const Q_LABELS: Record<string, string> = {
  q1: 'Coffee/Tea', q2: 'Weekend', q3: 'Activity', q4: 'Pet', q5: 'Time', q6: 'Cooking',
};

export default function Profile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');

  if (!user) {
    navigate('/login');
    return null;
  }

  const saveBio = () => {
    setCurrentUser({ ...user, bio });
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-heading font-bold">Profile</h1>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* Photos */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {user.photos.length > 0 ? user.photos.map((p, i) => (
            <img key={i} src={p} alt="" className="w-24 h-32 rounded-2xl object-cover flex-shrink-0" />
          )) : (
            <div className="w-24 h-32 rounded-2xl gradient-coral flex items-center justify-center text-3xl font-heading text-primary-foreground">
              {user.displayName[0]}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-heading font-bold">
          {user.displayName}, {getAge(user.birthdate)}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{user.gender} · Looking for {user.preference}</p>

        {/* Bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Bio</span>
            {editing ? (
              <div className="flex gap-1">
                <button onClick={saveBio}><Check size={16} className="text-primary" /></button>
                <button onClick={() => { setEditing(false); setBio(user.bio); }}><X size={16} className="text-muted-foreground" /></button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}><Edit3 size={14} className="text-muted-foreground" /></button>
            )}
          </div>
          {editing ? (
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full h-20 rounded-xl border border-input bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{user.bio || 'No bio yet'}</p>
          )}
        </div>

        {/* Questionnaire */}
        {Object.keys(user.questionnaire).length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">About me</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(user.questionnaire).map(([key, val]) => (
                <span key={key} className="px-3 py-1.5 bg-rose-soft text-xs rounded-full text-secondary-foreground font-medium capitalize">
                  {Q_LABELS[key] || key}: {val}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate('/photos')}
          variant="outline"
          className="w-full mt-6 h-11 rounded-xl"
        >
          Edit Photos
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
