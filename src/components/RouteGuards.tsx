import { ReactElement, useEffect, useRef, useState } from 'react';
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

const ONBOARDING_PAGES = ['/questionnaire', '/photos'];

function useUserDestination(shouldCheck: boolean) {
  const [destination, setDestination] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const checkedOnce = useRef(false);

  useEffect(() => {
    if (!shouldCheck) {
      setDestination(null);
      setChecking(false);
      checkedOnce.current = false;
      return;
    }

    // Only run the check once per auth session to avoid stale-data loops
    if (checkedOnce.current) return;

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
        if (!cancelled) {
          setChecking(false);
          checkedOnce.current = true;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [shouldCheck]);

  const clearDestination = () => {
    setDestination(null);
  };

  return { destination, checking, clearDestination };
}

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { destination, checking } = useUserDestination(Boolean(user) && !loading);

  if (loading || checking) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // Allow staying on any onboarding page without redirect loops
  if (ONBOARDING_PAGES.includes(location.pathname)) {
    return children;
  }

  if (destination === '/questionnaire') {
    return <Navigate to="/questionnaire" replace />;
  }

  if (destination === '/photos') {
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
