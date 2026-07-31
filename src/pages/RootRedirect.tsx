import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
// Landing v3 (src/pages/landing/). The previous page (./LandingPageAlt) is kept
// intact for instant rollback — swap the import to revert.
import LandingPage from './landing/LandingPage';

export default function RootRedirect() {
  const { user, session, loading } = useAuth();

  if (loading) return null;

  if (user || session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
