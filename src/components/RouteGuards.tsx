import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/context/OnboardingContext';

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

const ONBOARDING_PAGES = ['/questionnaire', '/photos'];

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { destination, loading: onboardingLoading } = useOnboarding();
  const onboardingTransition = Boolean((location.state as { onboardingTransition?: boolean } | null)?.onboardingTransition);

  if (loading || onboardingLoading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // Allow staying on any onboarding page without redirect loops
  if (ONBOARDING_PAGES.includes(location.pathname)) {
    return children;
  }

  if (destination && destination !== '/home' && destination !== location.pathname) {
    if (location.pathname === '/home' && onboardingTransition) {
      return children;
    }
    return <Navigate to={destination} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const { destination, loading: onboardingLoading } = useOnboarding();

  if (loading || onboardingLoading) return <FullscreenLoader />;
  if (user) return <Navigate to={destination ?? '/home'} replace />;

  return children;
}
