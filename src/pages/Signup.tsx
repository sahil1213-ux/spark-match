import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: 'Female' as 'Male' | 'Female' | 'Other',
    bio: '',
  });
  const [error, setError] = useState('');

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signupUser({ ...form, age: Number(form.age) });
      navigate('/questionnaire');
    } catch (err) {
      setError((err as Error).message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-sm mx-auto px-6 py-8">
        <h1 className="text-2xl font-heading font-bold mb-1">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <Input placeholder="Name" value={form.name} onChange={(e) => update('name', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="number" placeholder="Age" value={form.age} onChange={(e) => update('age', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required className="h-12 rounded-xl" />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => update('password', e.target.value)} required className="h-12 rounded-xl" />
          <Input placeholder="Bio" value={form.bio} onChange={(e) => update('bio', e.target.value)} className="h-12 rounded-xl" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">Continue</Button>
        </form>
      </div>
    </div>
  );
}
