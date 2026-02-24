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
    name: '',
    age: '',
    gender: 'Female' as 'Male' | 'Female' | 'Other',
    preference: 'Male' as 'Male' | 'Female' | 'Any',
    bio: '',
  });
  const [error, setError] = useState('');

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signupUser({ ...form, age: Number(form.age) });
      navigate('/questionnaire');
    } catch (err) {
      setError((err as Error).message || 'Signup failed');
    }
  };

  const genders: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];
  const prefs: Array<'Male' | 'Female' | 'Any'> = ['Male', 'Female', 'Any'];

  return (
    <div className="min-h-screen bg-background safe-top"><div className="max-w-sm mx-auto px-6 py-8">
      <button onClick={() => navigate('/login')} className="mb-4 text-muted-foreground"><ArrowLeft size={24} /></button>
      <h1 className="text-2xl font-heading font-bold mb-1">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <Input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} required className="h-12 rounded-xl" />
        <Input type="number" placeholder="Age" value={form.age} onChange={e => update('age', e.target.value)} required className="h-12 rounded-xl" />
        <Input type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} required className="h-12 rounded-xl" />
        <Input type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)} required className="h-12 rounded-xl" />
        <Input placeholder="Bio" value={form.bio} onChange={e => update('bio', e.target.value)} className="h-12 rounded-xl" />
        <div className="flex gap-2">{genders.map(g => <button key={g} type="button" onClick={() => update('gender', g)} className={`flex-1 py-2.5 rounded-xl ${form.gender === g ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{g}</button>)}</div>
        <div className="flex gap-2">{prefs.map(p => <button key={p} type="button" onClick={() => update('preference', p)} className={`flex-1 py-2.5 rounded-xl ${form.preference === p ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>{p}</button>)}</div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">Continue</Button>
      </form>
    </div></div>
  );
}
