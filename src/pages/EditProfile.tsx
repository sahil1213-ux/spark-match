import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { getCurrentUserProfile, updateUserProfileDetails, UserProfile } from '@/lib/store';
import { toast } from 'sonner';

type EditForm = Pick<
  UserProfile,
  | 'languages'
  | 'weekendPreference'
  | 'fitnessImportance'
  | 'sleepType'
  | 'smoking'
  | 'drinking'
  | 'diet'
  | 'highestEducationLevel'
  | 'collegeUniversity'
  | 'fieldOfStudy'
  | 'currentFocus'
>;

const defaultForm: EditForm = {
  languages: [],
  weekendPreference: undefined,
  fitnessImportance: undefined,
  sleepType: undefined,
  smoking: undefined,
  drinking: undefined,
  diet: undefined,
  highestEducationLevel: undefined,
  collegeUniversity: '',
  fieldOfStudy: '',
  currentFocus: undefined,
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
        languages: me.languages ?? [],
        weekendPreference: me.weekendPreference,
        fitnessImportance: me.fitnessImportance,
        sleepType: me.sleepType,
        smoking: me.smoking,
        drinking: me.drinking,
        diet: me.diet,
        highestEducationLevel: me.highestEducationLevel,
        collegeUniversity: me.collegeUniversity ?? '',
        fieldOfStudy: me.fieldOfStudy ?? '',
        currentFocus: me.currentFocus,
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

  const languageOptions = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Telugu', 'Tamil'] as const;
  const toggleLanguage = (language: string) => {
    setForm((prev) => {
      const current = prev.languages ?? [];
      const next = current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language];
      return { ...prev, languages: next };
    });
  };

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
          <label className="text-sm font-medium block">1. Which languages do you speak? (multi-select)</label>
          <div className="grid grid-cols-2 gap-2">
            {languageOptions.map((language) => {
              const selected = (form.languages ?? []).includes(language);
              return (
                <button
                  type="button"
                  key={language}
                  onClick={() => toggleLanguage(language)}
                  className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    selected ? 'gradient-coral text-primary-foreground' : 'border bg-background'
                  }`}
                >
                  {language}
                </button>
              );
            })}
          </div>

          <label className="text-sm font-medium block">2. How do you spend your weekends?</label>
          <select value={form.weekendPreference ?? ''} onChange={(e) => setForm((f) => ({ ...f, weekendPreference: (e.target.value || undefined) as UserProfile['weekendPreference'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="Going out">Going out</option>
            <option value="With friends">With friends</option>
            <option value="Working on goals">Working on goals</option>
            <option value="Relaxing alone">Relaxing alone</option>
          </select>

          <label className="text-sm font-medium block">3. How important is fitness in your life?</label>
          <select value={form.fitnessImportance ?? ''} onChange={(e) => setForm((f) => ({ ...f, fitnessImportance: (e.target.value || undefined) as UserProfile['fitnessImportance'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>

          <label className="text-sm font-medium block">4. Are you a night owl or early riser?</label>
          <select value={form.sleepType ?? ''} onChange={(e) => setForm((f) => ({ ...f, sleepType: (e.target.value || undefined) as UserProfile['sleepType'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="Night owl">Night owl</option>
            <option value="Early riser">Early riser</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">5. Do you smoke?</label>
              <select value={form.smoking ?? ''} onChange={(e) => setForm((f) => ({ ...f, smoking: (e.target.value || undefined) as UserProfile['smoking'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">6. Do you drink alcohol?</label>
              <select value={form.drinking ?? ''} onChange={(e) => setForm((f) => ({ ...f, drinking: (e.target.value || undefined) as UserProfile['drinking'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <label className="text-sm font-medium block">7. What's your diet?</label>
          <select value={form.diet ?? ''} onChange={(e) => setForm((f) => ({ ...f, diet: (e.target.value || undefined) as UserProfile['diet'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="Veg">Veg</option>
            <option value="Non-veg">Non-veg</option>
            <option value="Vegan">Vegan</option>
          </select>

          <label className="text-sm font-medium block">8. What’s your highest education level?</label>
          <select value={form.highestEducationLevel ?? ''} onChange={(e) => setForm((f) => ({ ...f, highestEducationLevel: (e.target.value || undefined) as UserProfile['highestEducationLevel'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Graduate">Graduate</option>
            <option value="Postgraduate">Postgraduate</option>
          </select>

          <label className="text-sm font-medium block">9. Which college/university did you attend?</label>
          <input value={form.collegeUniversity ?? ''} onChange={(e) => setForm((f) => ({ ...f, collegeUniversity: e.target.value }))} className="w-full rounded-2xl border bg-background px-3 py-2.5" />

          <label className="text-sm font-medium block">10. What is your field of study?</label>
          <input value={form.fieldOfStudy ?? ''} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} className="w-full rounded-2xl border bg-background px-3 py-2.5" />

          <label className="text-sm font-medium block">11. What is your current focus?</label>
          <select value={form.currentFocus ?? ''} onChange={(e) => setForm((f) => ({ ...f, currentFocus: (e.target.value || undefined) as UserProfile['currentFocus'] }))} className="w-full rounded-2xl border bg-background px-3 py-2.5">
            <option value="">Not selected</option>
            <option value="Studying">Studying</option>
            <option value="Job">Job</option>
            <option value="Business / Startup">Business / Startup</option>
            <option value="Exploring">Exploring</option>
          </select>
        </div>

        <Button className="w-full h-12 rounded-2xl gradient-coral" disabled={saving} onClick={() => void onSave()}>
          {saving ? 'Updating...' : 'Update Details'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
