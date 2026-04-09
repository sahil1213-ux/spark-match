import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X as XIcon } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUserProfile, updateUserProfileDetails, saveUserPhotos, UserProfile } from '@/lib/store';
import { toast } from 'sonner';

type EditForm = {
  bio: string;
  height: string;
  city: string;
  relationshipStatus: UserProfile['relationshipStatus'];
  lookingFor: UserProfile['lookingFor'];
  photos: string[];
  languages: string[];
  weekendPreference: UserProfile['weekendPreference'];
  fitnessImportance: UserProfile['fitnessImportance'];
  sleepType: UserProfile['sleepType'];
  smoking: UserProfile['smoking'];
  drinking: UserProfile['drinking'];
  diet: UserProfile['diet'];
  highestEducationLevel: UserProfile['highestEducationLevel'];
  collegeUniversity: string;
  fieldOfStudy: string;
  currentFocus: UserProfile['currentFocus'];
};

const MAX_PHOTOS = 6;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? undefined : opt)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                selected ? 'gradient-coral text-primary-foreground' : 'border bg-background text-foreground'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <p className="text-sm font-medium text-foreground bg-muted/50 rounded-2xl px-3 py-2.5">{value || '—'}</p>
    </div>
  );
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const me = await getCurrentUserProfile();
      if (!me) { navigate('/login'); return; }
      setUser(me);
      setForm({
        bio: me.bio ?? '',
        height: me.height ?? '',
        city: me.city ?? '',
        relationshipStatus: me.relationshipStatus,
        lookingFor: me.lookingFor,
        photos: me.photos ?? [],
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
    if (!user || !form) return;
    setSaving(true);
    try {
      // Upload any new base64 photos to Firebase Storage first
      const uploadedPhotos = await saveUserPhotos(user.id, form.photos);
      const { photos, ...rest } = form;
      await updateUserProfileDetails(user.id, { ...rest, photos: uploadedPhotos });
      toast.success('Profile updated');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to update profile', error);
      toast.error('Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const available = MAX_PHOTOS - form.photos.length;
    if (available <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos allowed`); return; }
    const toAdd = files.slice(0, available);
    const dataUrls = await Promise.all(toAdd.map(readFileAsDataUrl));
    setForm((f) => f ? { ...f, photos: [...f.photos, ...dataUrls] } : f);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setForm((f) => f ? { ...f, photos: f.photos.filter((_, i) => i !== idx) } : f);
  };

  if (!user || !form) return null;

  const languageOptions = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Telugu', 'Tamil'] as const;
  const toggleLanguage = (lang: string) => {
    setForm((f) => {
      if (!f) return f;
      const current = f.languages;
      const next = current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang];
      return { ...f, languages: next };
    });
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-4 pt-4 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/profile')} className="-ml-3">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <h1 className="text-xl font-heading font-bold">Edit Profile</h1>

        {/* Photos */}
        <div className="rounded-3xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-2">Your Photos</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {form.photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
                <img src={photo} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
            {form.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary transition-colors"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleAddPhotos(e)} />
        </div>

        {/* Bio & basics */}
        <div className="rounded-3xl border bg-card p-4 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Bio <span className="text-muted-foreground text-xs">(max 200 words)</span></label>
            <Textarea
              value={form.bio}
              onChange={(e) => {
                const words = e.target.value.split(/\s+/).filter(Boolean);
                if (words.length <= 200) setForm((f) => f ? { ...f, bio: e.target.value } : f);
              }}
              rows={4}
              className="rounded-2xl"
              placeholder="Tell people about yourself..."
            />
            <p className="text-xs text-muted-foreground mt-1">{form.bio.split(/\s+/).filter(Boolean).length}/200 words</p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Height <span className="text-muted-foreground text-xs">(optional)</span></label>
            <input
              value={form.height}
              onChange={(e) => setForm((f) => f ? { ...f, height: e.target.value } : f)}
              placeholder="e.g. 5'10&quot; or 178 cm"
              className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <ChipSelect
            label="Relationship Status"
            options={['Single', 'Divorced', 'Prefer not to say'] as const}
            value={form.relationshipStatus}
            onChange={(v) => setForm((f) => f ? { ...f, relationshipStatus: v } : f)}
          />

          <ChipSelect
            label="What are you looking for?"
            options={['Serious relationship', 'Marriage', 'Casual dating', 'Not sure'] as const}
            value={form.lookingFor}
            onChange={(v) => setForm((f) => f ? { ...f, lookingFor: v } : f)}
          />

          <div>
            <label className="text-sm font-medium block mb-1">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm((f) => f ? { ...f, city: e.target.value } : f)}
              className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm"
              placeholder="Your city"
            />
          </div>
        </div>

        {/* Read-only fields */}
        <div className="rounded-3xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold mb-1 text-muted-foreground">Account Info (read-only)</h2>
          <ReadOnlyField label="Full Name" value={user.name} />
          <ReadOnlyField label="Date of Birth" value={user.dob ?? ''} />
          <ReadOnlyField label="Gender Identity" value={user.identity ?? user.gender ?? ''} />
          <ReadOnlyField label="Interested In" value={user.interestedIn ?? ''} />
          <ReadOnlyField label="Phone" value={user.phone ?? ''} />
          <ReadOnlyField label="Email" value={user.email} />
        </div>

        {/* Lifestyle & preferences */}
        <div className="rounded-3xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold mb-1">Lifestyle & Preferences</h2>

          <label className="text-sm font-medium block">Languages (multi-select)</label>
          <div className="grid grid-cols-2 gap-2">
            {languageOptions.map((lang) => {
              const selected = form.languages.includes(lang);
              return (
                <button type="button" key={lang} onClick={() => toggleLanguage(lang)} className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${selected ? 'gradient-coral text-primary-foreground' : 'border bg-background'}`}>
                  {lang}
                </button>
              );
            })}
          </div>

          <label className="text-sm font-medium block">How do you spend your weekends?</label>
          <select value={form.weekendPreference ?? ''} onChange={(e) => setForm((f) => f ? { ...f, weekendPreference: (e.target.value || undefined) as UserProfile['weekendPreference'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="Going out">Going out</option>
            <option value="With friends">With friends</option>
            <option value="Working on goals">Working on goals</option>
            <option value="Relaxing alone">Relaxing alone</option>
          </select>

          <label className="text-sm font-medium block">How important is fitness?</label>
          <select value={form.fitnessImportance ?? ''} onChange={(e) => setForm((f) => f ? { ...f, fitnessImportance: (e.target.value || undefined) as UserProfile['fitnessImportance'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>

          <label className="text-sm font-medium block">Night owl or Early riser?</label>
          <select value={form.sleepType ?? ''} onChange={(e) => setForm((f) => f ? { ...f, sleepType: (e.target.value || undefined) as UserProfile['sleepType'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="Night owl">Night owl</option>
            <option value="Early riser">Early riser</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block">Smoking?</label>
              <select value={form.smoking ?? ''} onChange={(e) => setForm((f) => f ? { ...f, smoking: (e.target.value || undefined) as UserProfile['smoking'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Drinking?</label>
              <select value={form.drinking ?? ''} onChange={(e) => setForm((f) => f ? { ...f, drinking: (e.target.value || undefined) as UserProfile['drinking'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
                <option value="">Not selected</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <label className="text-sm font-medium block">Diet</label>
          <select value={form.diet ?? ''} onChange={(e) => setForm((f) => f ? { ...f, diet: (e.target.value || undefined) as UserProfile['diet'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="Veg">Veg</option>
            <option value="Non-veg">Non-veg</option>
            <option value="Vegan">Vegan</option>
          </select>

          <label className="text-sm font-medium block">Highest education level</label>
          <select value={form.highestEducationLevel ?? ''} onChange={(e) => setForm((f) => f ? { ...f, highestEducationLevel: (e.target.value || undefined) as UserProfile['highestEducationLevel'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="High School">High School</option>
            <option value="Diploma">Diploma</option>
            <option value="Graduate">Graduate</option>
            <option value="Postgraduate">Postgraduate</option>
          </select>

          <label className="text-sm font-medium block">College / University</label>
          <input value={form.collegeUniversity} onChange={(e) => setForm((f) => f ? { ...f, collegeUniversity: e.target.value } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm" />

          <label className="text-sm font-medium block">Field of Study</label>
          <input value={form.fieldOfStudy} onChange={(e) => setForm((f) => f ? { ...f, fieldOfStudy: e.target.value } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm" />

          <label className="text-sm font-medium block">Current Focus</label>
          <select value={form.currentFocus ?? ''} onChange={(e) => setForm((f) => f ? { ...f, currentFocus: (e.target.value || undefined) as UserProfile['currentFocus'] } : f)} className="w-full rounded-2xl border bg-background px-3 py-2.5 text-sm">
            <option value="">Not selected</option>
            <option value="Studying">Studying</option>
            <option value="Job">Job</option>
            <option value="Business / Startup">Business / Startup</option>
            <option value="Exploring">Exploring</option>
          </select>
        </div>

        <Button className="w-full h-12 rounded-2xl gradient-coral text-primary-foreground font-semibold" disabled={saving} onClick={() => void onSave()}>
          {saving ? 'Updating...' : 'Update Profile'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
