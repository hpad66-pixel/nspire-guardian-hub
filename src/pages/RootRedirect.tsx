import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LandingPageAlt from './LandingPageAlt';

export default function RootRedirect() {
  const { user, session, loading } = useAuth();

  if (loading) return null;

  if (user || session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPageAlt />;
}
