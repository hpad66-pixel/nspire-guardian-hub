import { Navigate } from 'react-router-dom';

// Placeholder — Owner portal redirects to Executive Suite for now
export default function OwnerPortalPage() {
  return <Navigate to="/reports/executive" replace />;
}
