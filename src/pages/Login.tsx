import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = loginUser(email, password);
    if (user) {
      navigate('/home');
    } else {
      setError('Account not found. Please sign up first.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-soft">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl gradient-coral flex items-center justify-center mb-4 shadow-lg">
          <Heart size={32} className="text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-1">Flame</h1>
        <p className="text-muted-foreground text-sm mb-8">Find your spark ✨</p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl bg-card"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-xl bg-card"
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0">
            Log In
          </Button>
        </form>

        <button className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Forgot password?
        </button>

        <div className="mt-8 text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-primary font-semibold hover:underline"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
