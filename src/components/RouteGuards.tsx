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

// Module-level cache so destination survives across ProtectedRoute instances
let cachedDestination: string | null = null;
let cachedForUid: string | null = null;

function useUserDestination(user: { uid: string } | null, loading: boolean) {
  const [destination, setDestination] = useState<string | null>(cachedDestination);
  const [checking, setChecking] = useState(false);
  const ran = useRef(false);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (loading || !uid) {
      setDestination(null);
      setChecking(false);
      ran.current = false;
      cachedDestination = null;
      cachedForUid = null;
      return;
    }

    // Use cache if we already checked for this user
    if (cachedForUid === uid && cachedDestination !== null) {
      setDestination(cachedDestination);
      return;
    }

    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    setChecking(true);

    const run = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (cancelled) return;

        let dest = '/home';
        if (!profile || !profile.onboardingCompleted) {
          dest = '/questionnaire';
        } else if ((profile.photos?.length ?? 0) === 0) {
          dest = '/photos';
        }

        cachedDestination = dest;
        cachedForUid = uid;
        setDestination(dest);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [uid, loading]);

  return { destination, checking };
}

/** Call after completing an onboarding step to advance the cached destination */
export function advanceOnboarding(to: string) {
  cachedDestination = to;
}

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { destination, checking } = useUserDestination(user, loading);

  if (loading || checking) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // Allow staying on any onboarding page without redirect loops
  if (ONBOARDING_PAGES.includes(location.pathname)) {
    return children;
  }

  if (destination && destination !== '/home' && destination !== location.pathname) {
    return <Navigate to={destination} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const { destination, checking } = useUserDestination(user, loading);

  if (loading || checking) return <FullscreenLoader />;
  if (user) return <Navigate to={destination ?? '/home'} replace />;

  return children;
}
