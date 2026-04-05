import { ReactElement, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCurrentUserProfile } from '@/lib/store';

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function useUserDestination(shouldCheck: boolean) {
  const [destination, setDestination] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!shouldCheck) {
      setDestination(null);
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    const run = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (cancelled) return;

        if (!profile || !profile.onboardingCompleted) {
          setDestination('/questionnaire');
          return;
        }

        if ((profile.photos?.length ?? 0) === 0) {
          setDestination('/photos');
          return;
        }

        setDestination('/home');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [shouldCheck]);

  return { destination, checking };
}

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { destination, checking } = useUserDestination(Boolean(user) && !loading);

  if (loading || checking) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (destination === '/questionnaire' && location.pathname !== '/questionnaire') {
    return <Navigate to="/questionnaire" replace />;
  }

  if (destination === '/photos' && location.pathname !== '/photos') {
    return <Navigate to="/photos" replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const { destination, checking } = useUserDestination(Boolean(user) && !loading);

  if (loading || checking) return <FullscreenLoader />;
  if (user) return <Navigate to={destination ?? '/home'} replace />;

  return children;
}
