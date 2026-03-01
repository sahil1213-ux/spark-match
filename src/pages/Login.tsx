import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, loginWithApple, loginWithGoogle } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await loginUser(email, password);
      navigate('/home');
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    }
  };

  const handleProviderLogin = async (type: 'google' | 'apple') => {
    try {
      setError('');
      if (type === 'google') await loginWithGoogle();
      if (type === 'apple') await loginWithApple();
      navigate('/home');
    } catch (err) {
      setError((err as Error).message || `Unable to login with ${type}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-soft">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl gradient-coral flex items-center justify-center mb-4 shadow-lg">
          <Heart size={32} className="text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-1">Spark Match</h1>

        <form onSubmit={handleEmailLogin} className="w-full space-y-4 mt-8">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl bg-card" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl bg-card" />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl gradient-coral text-primary-foreground">Log In</Button>
        </form>

        <div className="w-full mt-4 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => handleProviderLogin('google')}>Continue with Google</Button>
          <Button variant="outline" className="w-full" onClick={() => handleProviderLogin('apple')}>Continue with Apple</Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          Don't have an account? <button onClick={() => navigate('/signup')} className="text-primary font-semibold hover:underline">Sign Up</button>
        </div>
      </div>
    </div>
  );
}
