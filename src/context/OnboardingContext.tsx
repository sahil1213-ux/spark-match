import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentUserProfile } from '@/lib/store';

export type OnboardingDestination = '/questionnaire' | '/photos' | '/home';

type OnboardingState = {
  uid: string | null;
  destination: OnboardingDestination | null;
  loading: boolean;
};

type OnboardingContextValue = {
  destination: OnboardingDestination | null;
  loading: boolean;
  advance: (to: OnboardingDestination) => void;
};

const DESTINATION_RANK: Record<OnboardingDestination, number> = {
  '/questionnaire': 0,
  '/photos': 1,
  '/home': 2,
};

const OnboardingContext = createContext<OnboardingContextValue>({
  destination: null,
  loading: true,
  advance: () => undefined,
});

function resolveDestination(profile: Awaited<ReturnType<typeof getCurrentUserProfile>>): OnboardingDestination {
  if (!profile || !profile.onboardingCompleted) return '/questionnaire';
  if ((profile.photos?.length ?? 0) === 0) return '/photos';
  return '/home';
}

function mergeDestination(
  current: OnboardingDestination | null,
  next: OnboardingDestination,
): OnboardingDestination {
  if (!current) return next;
  return DESTINATION_RANK[next] >= DESTINATION_RANK[current] ? next : current;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<OnboardingState>({
    uid: null,
    destination: null,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!uid) {
      setState({ uid: null, destination: null, loading: false });
      return;
    }

    if (state.uid === uid && state.destination) {
      if (state.loading) {
        setState((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    let cancelled = false;

    setState((prev) => (
      prev.uid === uid
        ? { ...prev, loading: true }
        : { uid, destination: null, loading: true }
    ));

    const load = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (cancelled) return;

        const nextDestination = resolveDestination(profile);
        setState((prev) => ({
          uid,
          destination: prev.uid === uid ? mergeDestination(prev.destination, nextDestination) : nextDestination,
          loading: false,
        }));
      } catch {
        if (cancelled) return;

        setState((prev) => ({
          uid,
          destination: prev.uid === uid && prev.destination ? prev.destination : '/questionnaire',
          loading: false,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, uid, state.uid, state.destination, state.loading]);

  const advance = useCallback((to: OnboardingDestination) => {
    if (!uid) return;

    setState((prev) => ({
      uid,
      destination: prev.uid === uid ? mergeDestination(prev.destination, to) : to,
      loading: false,
    }));
  }, [uid]);

  const value = useMemo(() => ({
    destination: state.destination,
    loading: authLoading || state.loading,
    advance,
  }), [advance, authLoading, state.destination, state.loading]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}