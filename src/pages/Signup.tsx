import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    birthdate: '',
    gender: 'Female' as 'Male' | 'Female' | 'Other',
    preference: 'Male' as 'Male' | 'Female' | 'Any',
    bio: '',
  });

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signupUser(form);
    navigate('/questionnaire');
  };

  const genders: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];
  const prefs: Array<'Male' | 'Female' | 'Any'> = ['Male', 'Female', 'Any'];

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-sm mx-auto px-6 py-8">
        <button onClick={() => navigate('/login')} className="mb-4 text-muted-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-heading font-bold mb-1">Create Account</h1>
        <p className="text-sm text-muted-foreground mb-6">Let's get you started 💫</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Display Name" value={form.displayName} onChange={e => update('displayName', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="date" placeholder="Birthday" value={form.birthdate} onChange={e => update('birthdate', e.target.value)} required className="h-12 rounded-xl" />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Gender</label>
            <div className="flex gap-2">
              {genders.map(g => (
                <button
                  type="button"
                  key={g}
                  onClick={() => update('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    form.gender === g ? 'gradient-coral text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Interested in</label>
            <div className="flex gap-2">
              {prefs.map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => update('preference', p)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    form.preference === p ? 'gradient-coral text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Short bio..."
            value={form.bio}
            onChange={e => update('bio', e.target.value)}
            className="w-full h-24 rounded-xl border border-input bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <Button type="submit" className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
