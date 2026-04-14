import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, signupUser, updateUserLocation } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import EmailOtpDialog from '@/components/EmailOtpDialog';

type Identity = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
type InterestedIn = 'Men' | 'Women' | 'Everyone';

function calculateAgeFromDob(dob: string) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(age, 18);
}

function mapIdentityToGender(identity: Identity): 'Male' | 'Female' | 'Other' {
  if (identity === 'Male') return 'Male';
  if (identity === 'Female') return 'Female';
  return 'Other';
}

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    dob: '',
    identity: 'Prefer not to say' as Identity,
    interestedIn: 'Everyone' as InterestedIn,
    city: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);

  const update = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      () => {},
    );
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.email.trim() &&
      form.password.trim() &&
      form.fullName.trim() &&
      form.dob &&
      form.city.trim() &&
      form.phone.trim() &&
      emailVerified &&
      phoneVerified,
    );
  }, [emailVerified, phoneVerified, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const age = calculateAgeFromDob(form.dob);
      await signupUser({
        email: form.email,
        password: form.password,
        name: form.fullName,
        age,
        gender: mapIdentityToGender(form.identity),
        bio: '',
        identity: form.identity,
        interestedIn: form.interestedIn,
        dob: form.dob,
        phone: form.phone,
        city: form.city,
        emailVerified,
        phoneVerified,
      });

      if (coords) {
        const user = getCurrentUserId();
        if (user) await updateUserLocation(user, coords.lat, coords.lon);
      }

      navigate('/questionnaire');
    } catch (err) {
      setError((err as Error).message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-sm mx-auto px-6 py-8">
        <button onClick={() => navigate('/login')} className="mb-4 text-muted-foreground"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-heading font-bold mb-1">Step 1: Basic Information</h1>
        <p className="text-sm text-muted-foreground">EliteSync profile creation quick start</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <Input placeholder="Full name" value={form.fullName} onChange={e => update('fullName', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="date" value={form.dob} onChange={e => update('dob', e.target.value)} required className="h-12 rounded-xl" />

          <div>
            <p className="text-sm font-medium mb-2">How do you identify?</p>
            <div className="grid grid-cols-2 gap-2">
              {(['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const).map((item) => (
                <button key={item} type="button" onClick={() => update('identity', item)} className={`py-2.5 rounded-xl text-sm ${form.identity === item ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{item}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Who are you interested in?</p>
            <div className="grid grid-cols-3 gap-2">
              {(['Men', 'Women', 'Everyone'] as const).map((item) => (
                <button key={item} type="button" onClick={() => update('interestedIn', item)} className={`py-2.5 rounded-xl text-sm ${form.interestedIn === item ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{item}</button>
              ))}
            </div>
          </div>

          <Input placeholder="Current city (auto-detect + editable)" value={form.city} onChange={e => update('city', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="tel" placeholder="Phone number" value={form.phone} onChange={e => update('phone', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)} required className="h-12 rounded-xl" />

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => {
              if (!form.email || !form.email.includes('@')) {
                setError('Please enter a valid email first');
                return;
              }
              setError('');
              setShowOtpDialog(true);
            }} className={`rounded-xl py-2.5 text-sm border ${emailVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-card'}`} disabled={emailVerified}>
              {emailVerified ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Email verified</span> : 'Verify email'}
            </button>
            <button type="button" onClick={() => form.phone && setPhoneVerified(true)} className={`rounded-xl py-2.5 text-sm border ${phoneVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-card'}`}>
              {phoneVerified ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Phone verified</span> : 'Verify phone'}
            </button>
          </div>

          <EmailOtpDialog
            open={showOtpDialog}
            onOpenChange={setShowOtpDialog}
            email={form.email}
            onVerified={() => setEmailVerified(true)}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!canSubmit} className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">Continue to Personality Check</Button>
        </form>
      </div>
    </div>
  );
}
