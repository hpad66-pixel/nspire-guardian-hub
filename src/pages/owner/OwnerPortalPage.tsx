import { Routes, Route, Navigate } from 'react-router-dom';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import OwnerOverviewPage from './OwnerOverviewPage';
import OwnerProjectsPage from './OwnerProjectsPage';
import OwnerCompliancePage from './OwnerCompliancePage';
import OwnerDocumentsPage from './OwnerDocumentsPage';
import OwnerContactPage from './OwnerContactPage';

export default function OwnerPortalPage() {
  return (
    <div className="flex h-screen w-full" style={{ background: '#F7F4EF' }}>
      <OwnerSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<OwnerOverviewPage />} />
          <Route path="projects" element={<OwnerProjectsPage />} />
          <Route path="compliance" element={<OwnerCompliancePage />} />
          <Route path="documents" element={<OwnerDocumentsPage />} />
          <Route path="contact" element={<OwnerContactPage />} />
          <Route path="*" element={<Navigate to="/owner-portal" replace />} />
        </Routes>
      </main>
    </div>
  );
}
