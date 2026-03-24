import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { getCurrentUserProfile, updateUserProfileDetails, UserProfile } from '@/lib/store';
import { toast } from 'sonner';

type EditForm = Pick<
  UserProfile,
  | 'bio'
  | 'city'
  | 'relationshipGoal'
  | 'wantsChildren'
  | 'hasChildren'
  | 'smoking'
  | 'drinking'
  | 'exerciseFrequency'
  | 'sleepHabits'
  | 'eatingPreference'
  | 'occupation'
  | 'height'
>;

const defaultForm: EditForm = {
  bio: '',
  city: '',
  relationshipGoal: undefined,
  wantsChildren: undefined,
  hasChildren: undefined,
  smoking: undefined,
  drinking: undefined,
  exerciseFrequency: undefined,
  sleepHabits: undefined,
  eatingPreference: undefined,
  occupation: '',
  height: '',
};

export default function EditProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<EditForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const me = await getCurrentUserProfile();
      if (!me) {
        navigate('/login');
        return;
      }

      setUser(me);
      setForm({
        bio: me.bio ?? '',
        city: me.city ?? '',
        relationshipGoal: me.relationshipGoal,
        wantsChildren: me.wantsChildren,
        hasChildren: me.hasChildren,
        smoking: me.smoking,
        drinking: me.drinking,
        exerciseFrequency: me.exerciseFrequency,
        sleepHabits: me.sleepHabits,
        eatingPreference: me.eatingPreference,
        occupation: me.occupation ?? '',
        height: me.height ?? '',
      });
    };

    void load();
  }, [navigate]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfileDetails(user.id, form);
      toast.success('Profile updated');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to update profile', error);
      toast.error('Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/profile')} className="-ml-3">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="rounded-3xl border bg-card p-4">
          <h1 className="text-xl font-heading font-bold mb-3">Edit Profile Details</h1>
          <h2 className="text-sm font-semibold mb-2">Your Images</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(user.photos?.length ? user.photos : [null]).map((photo, index) => (
              <div key={index} className="aspect-square rounded-2xl overflow-hidden bg-secondary">
                {photo ? (
                  <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate('/photos')}>
            Manage Photos
          </Button>
        </div>

        <div className="rounded-3xl border bg-card p-4 space-y-3">
          <label className="text-sm font-medium block">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className="w-full min-h-24 rounded-2xl border bg-background p-3 text-sm" />

          <label className="text-sm font-medium block">Current city / town</label>
          <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full rounded-2xl border bg-background px-3 py-2.5" />

          <label className="text-sm font-medium block">Relationship Intent</label>
          <select value={form.relationshipGoal ?? ''} onChange={(e) => setForm((f) => ({ ...f, relationshipGoal: (e.target.value || undefined) as UserProfile['relationshipGoal'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="short-term">Short-term</option>
            <option value="long-term">Long-term</option>
            <option value="friends">Friends</option>
            <option value="open to anything">Open to anything</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">Smoke</label>
              <select value={form.smoking ?? ''} onChange={(e) => setForm((f) => ({ ...f, smoking: (e.target.value || undefined) as UserProfile['smoking'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Drink</label>
              <select value={form.drinking ?? ''} onChange={(e) => setForm((f) => ({ ...f, drinking: (e.target.value || undefined) as UserProfile['drinking'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">Eating preference</label>
              <select value={form.eatingPreference ?? ''} onChange={(e) => setForm((f) => ({ ...f, eatingPreference: (e.target.value || undefined) as UserProfile['eatingPreference'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="omnivore">Omnivore</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Exercise</label>
              <select value={form.exerciseFrequency ?? ''} onChange={(e) => setForm((f) => ({ ...f, exerciseFrequency: (e.target.value || undefined) as UserProfile['exerciseFrequency'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="never">Never</option>
                <option value="rarely">Rarely</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">Sleep habits</label>
              <select value={form.sleepHabits ?? ''} onChange={(e) => setForm((f) => ({ ...f, sleepHabits: (e.target.value || undefined) as UserProfile['sleepHabits'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="early bird">Early bird</option>
                <option value="night owl">Night owl</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Wants children</label>
              <select value={form.wantsChildren ?? ''} onChange={(e) => setForm((f) => ({ ...f, wantsChildren: (e.target.value || undefined) as UserProfile['wantsChildren'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Unsure</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">Has children</label>
              <select value={form.hasChildren ?? ''} onChange={(e) => setForm((f) => ({ ...f, hasChildren: (e.target.value || undefined) as UserProfile['hasChildren'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Height</label>
              <input value={form.height ?? ''} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} placeholder="e.g. 170 cm" className="w-full rounded-2xl border bg-background px-3 py-2.5" />
            </div>
          </div>

          <label className="text-sm font-medium block">Occupation</label>
          <input value={form.occupation ?? ''} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} className="w-full rounded-2xl border bg-background px-3 py-2.5" />
        </div>

        <Button className="w-full h-12 rounded-2xl gradient-coral" disabled={saving} onClick={() => void onSave()}>
          {saving ? 'Updating...' : 'Update Details'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
