import { Navigate } from 'react-router-dom';
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin';
import { Loader2 } from 'lucide-react';

export function PlatformProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: isPlatformAdmin, isLoading } = useIsPlatformAdmin();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090D17]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
