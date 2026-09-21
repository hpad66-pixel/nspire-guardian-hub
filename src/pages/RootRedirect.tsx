import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
// Landing v3 (src/pages/landing/). The previous page (./LandingPageAlt) is kept
// intact for instant rollback — swap the import to revert.
import LandingPage from './landing/LandingPage';

export function clientPortalRootDestination(hostname: string, authenticated: boolean) {
  if (hostname.toLowerCase() !== 'client.projos.ai') return null;
  return authenticated ? '/owner-portal' : '/auth?portal=client&next=%2Fowner-portal';
}

export default function RootRedirect() {
  const { user, session, loading } = useAuth();

  if (loading) return null;

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const clientPortalDestination = clientPortalRootDestination(hostname, Boolean(user || session));
  if (clientPortalDestination) {
    return <Navigate to={clientPortalDestination} replace />;
  }

  if (user || session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
