import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate(user ? '/home' : '/login', { replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-coral">
      <div className="w-20 h-20 rounded-3xl bg-primary-foreground/20 flex items-center justify-center mb-4 animate-pulse">
        <Heart size={40} className="text-primary-foreground" fill="currentColor" />
      </div>
      <h1 className="text-4xl font-heading font-bold text-primary-foreground">EliteSync</h1>
      <p className="text-primary-foreground/70 mt-1">Find your spark</p>
    </div>
  );
}
