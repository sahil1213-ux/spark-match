import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/store';
import { Heart } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = getCurrentUser();
      navigate(user ? '/home' : '/login');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-coral">
      <div className="w-20 h-20 rounded-3xl bg-primary-foreground/20 flex items-center justify-center mb-4 animate-pulse">
        <Heart size={40} className="text-primary-foreground" fill="currentColor" />
      </div>
      <h1 className="text-4xl font-heading font-bold text-primary-foreground">Flame</h1>
      <p className="text-primary-foreground/70 mt-1">Find your spark</p>
    </div>
  );
}
