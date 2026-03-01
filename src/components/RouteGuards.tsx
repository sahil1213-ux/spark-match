import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (user) return <Navigate to="/home" replace />;

  return children;
}
