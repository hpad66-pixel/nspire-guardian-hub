import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Root redirect — bounces authenticated users to /dashboard (the Proj OS
 * light-theme app) and guests to /auth. Replaces the dark APAS marketing
 * landing at /. The marketing landing is still available at /landing if
 * needed later.
 */
export default function RootRedirect() {
  const { user, session } = useAuth();

  if (user || session) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/auth" replace />;
}
