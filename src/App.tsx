import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from '@/hooks/useAuth';
import { flushOfflineQueue } from '@/lib/flushOfflineQueue';

// Pages — lazy loaded for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LandingPageAlt = lazy(() => import('./pages/LandingPageAlt'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const InstallPage = lazy(() => import('./pages/InstallPage'));
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'));
const InspectionsDashboard = lazy(() => import('./pages/inspections/InspectionsDashboard'));
const OutsideInspections = lazy(() => import('./pages/inspections/OutsideInspections'));
const InsideInspections = lazy(() => import('./pages/inspections/InsideInspections'));
const UnitInspections = lazy(() => import('./pages/inspections/UnitInspections'));
const DailyGroundsPage = lazy(() => import('./pages/inspections/DailyGroundsPage'));
const InspectionReviewPage = lazy(() => import('./pages/inspections/InspectionReviewPage'));
const InspectionHistoryPage = lazy(() => import('./pages/inspections/InspectionHistoryPage'));
const ProjectsDashboard = lazy(() => import('./pages/projects/ProjectsDashboard'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const ProposalsPage = lazy(() => import('./pages/projects/ProposalsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const WorkspaceProfilePage = lazy(() => import('./pages/settings/WorkspaceProfilePage'));
const ActivityLogPage = lazy(() => import('./pages/settings/ActivityLogPage'));
const PropertiesPage = lazy(() => import('./pages/core/PropertiesPage'));
const UnitsPage = lazy(() => import('./pages/core/UnitsPage'));
const IssuesPage = lazy(() => import('./pages/core/IssuesPage'));
const WorkOrdersPage = lazy(() => import('./pages/workorders/WorkOrdersPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const PropertyArchivesPage = lazy(() => import('./pages/documents/PropertyArchivesPage'));
const AssetsPage = lazy(() => import('./pages/assets/AssetsPage'));
const MailboxPage = lazy(() => import('./pages/inbox/MailboxPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));
const PermitsDashboard = lazy(() => import('./pages/permits/PermitsDashboard'));
const PermitDetailPage = lazy(() => import('./pages/permits/PermitDetailPage'));
const PeoplePage = lazy(() => import('./pages/people/PeoplePage'));
const OccupancyPage = lazy(() => import('./pages/occupancy/OccupancyPage'));
const QRScannerPage = lazy(() => import('./pages/qr/QRScannerPage'));
const TrainingPage = lazy(() => import('./pages/training/TrainingPage'));
const TrainingDashboardPage = lazy(() => import('./pages/training/TrainingDashboardPage'));
const CertificateSharePage = lazy(() => import('./pages/training/CertificateSharePage'));
const ContactsPage = lazy(() => import('./pages/crm/ContactsPage'));
const VoiceAgentDashboard = lazy(() => import('./pages/voice-agent/VoiceAgentDashboard'));
const OrganizationsPage = lazy(() => import('./pages/organizations/OrganizationsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ClientPortalPage = lazy(() => import('./pages/portal/ClientPortalPage'));
const PropertyAnalyticsPage = lazy(() => import('./pages/core/PropertyAnalyticsPage'));
const PropertyGalleryPage = lazy(() => import('./pages/core/PropertyGalleryPage'));
const CredentialsDashboardPage = lazy(() => import('./pages/credentials/CredentialsDashboardPage'));
const CredentialSharePage = lazy(() => import('./pages/credentials/CredentialSharePage'));
const SchoolManagementPage = lazy(() => import('./pages/admin/SchoolManagementPage'));
const SafetyDashboardPage = lazy(() => import('./pages/safety/SafetyDashboardPage'));
const EquipmentDashboardPage = lazy(() => import('./pages/equipment/EquipmentDashboardPage'));
const EquipmentSetupPage = lazy(() => import('./pages/equipment/EquipmentSetupPage'));
const PortalsDashboardPage = lazy(() => import('./pages/portals/PortalsDashboardPage'));
const PortalManagePage = lazy(() => import('./pages/portals/PortalManagePage'));
const PortalLoginPage = lazy(() => import('./pages/portal/PortalLoginPage'));
const PortalAuthPage = lazy(() => import('./pages/portal/PortalAuthPage'));
const PortalWelcomePage = lazy(() => import('./pages/portal/PortalWelcomePage'));
const PortalHomePage = lazy(() => import('./pages/portal/PortalHomePage'));
const CaseReviewPage = lazy(() => import('./pages/case-review/CaseReviewPage'));
const ExecutiveSuitePage = lazy(() => import('./pages/reports/ExecutiveSuitePage'));
const ComplianceCalendarPage = lazy(() => import('./pages/compliance/ComplianceCalendarPage'));
const RiskRegisterPage = lazy(() => import('./pages/risk/RiskRegisterPage'));
const CorrectiveActionPage = lazy(() => import('./pages/compliance/CorrectiveActionPage'));
const EscalationRulesPage = lazy(() => import('./pages/settings/EscalationRulesPage'));
const CorrectiveLoopPage = lazy(() => import('./pages/corrective-loop/CorrectiveLoopPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPageAlt />;
}

/** Registers the offline queue flush handler on mount and on connectivity restore. */
function OfflineQueueManager() {
  useEffect(() => {
    // Flush once on app startup (catches queued items from previous offline session)
    flushOfflineQueue(false).catch(console.error);

    // Flush again whenever connectivity is restored
    const handleOnline = () => {
      flushOfflineQueue(true).catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ModuleProvider>
              <Toaster />
              <Sonner />
              <OfflineQueueManager />
              <BrowserRouter>
                <Suspense fallback={
                  <div className="flex h-screen w-full items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                  </div>
                }>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/home-alt" element={<LandingPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                     <Route path="/portal/:slug" element={<PortalLoginPage />} />
                     <Route path="/portal/:slug/auth" element={<PortalAuthPage />} />
                     <Route path="/portal/:slug/welcome" element={<PortalWelcomePage />} />
                     <Route path="/portal/:slug/home" element={<PortalHomePage />} />
                     <Route path="/share/credential/:token" element={<CredentialSharePage />} />
                     <Route path="/share/certificate/:token" element={<CertificateSharePage />} />
                     
                    {/* Protected Routes */}
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <Routes>
                              {/* Dashboard */}
                              <Route path="/dashboard" element={<Dashboard />} />
                              
                              {/* Core Platform */}
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id/gallery" element={<PropertyGalleryPage />} />
              <Route path="/properties/:propertyId/analytics" element={<PropertyAnalyticsPage />} />
                              <Route path="/units" element={<UnitsPage />} />
                              <Route path="/assets" element={<AssetsPage />} />
                              <Route path="/issues" element={<IssuesPage />} />
                              <Route path="/work-orders" element={<WorkOrdersPage />} />
                              <Route path="/documents" element={<DocumentsPage />} />
                              <Route path="/documents/archives" element={<PropertyArchivesPage />} />
                              <Route path="/people" element={<PeoplePage />} />
                              <Route path="/organizations" element={<OrganizationsPage />} />
                              <Route path="/inbox" element={<MailboxPage />} />
                              <Route path="/messages" element={<MessagesPage />} />
                              <Route path="/messages/:threadId" element={<MessagesPage />} />
                              <Route path="/reports" element={<ReportsPage />} />
                              <Route path="/occupancy" element={<OccupancyPage />} />
                              <Route path="/qr-scanner" element={<QRScannerPage />} />
                              <Route path="/training" element={<TrainingDashboardPage />} />
                              <Route path="/training/dashboard" element={<TrainingDashboardPage />} />
                              <Route path="/contacts" element={<ContactsPage />} />
                              <Route path="/voice-agent" element={<VoiceAgentDashboard />} />
                              <Route path="/settings/activity-log" element={<ActivityLogPage />} />
                              
                              {/* NSPIRE Inspections Module */}
                              <Route path="/inspections" element={<InspectionsDashboard />} />
                              <Route path="/inspections/daily" element={<DailyGroundsPage />} />
                              <Route path="/inspections/history" element={<InspectionHistoryPage />} />
                              <Route path="/inspections/review" element={<InspectionReviewPage />} />
                              <Route path="/inspections/outside" element={<OutsideInspections />} />
                              <Route path="/inspections/inside" element={<InsideInspections />} />
                              <Route path="/inspections/units" element={<UnitInspections />} />
                              
                              {/* Projects Module */}
                              <Route path="/projects" element={<ProjectsDashboard />} />
                              <Route path="/projects/proposals" element={<ProposalsPage />} />
                              <Route path="/projects/:id" element={<ProjectDetailPage />} />
                              
                              {/* Permits & Compliance */}
                              <Route path="/permits" element={<PermitsDashboard />} />
                              <Route path="/permits/:id" element={<PermitDetailPage />} />
                              <Route path="/compliance-calendar" element={<ComplianceCalendarPage />} />
                              <Route path="/risk-register" element={<RiskRegisterPage />} />
                              <Route path="/corrective-actions" element={<CorrectiveActionPage />} />
                              <Route path="/corrective-loop" element={<CorrectiveLoopPage />} />
                              
                              {/* Profile */}
                              <Route path="/profile" element={<ProfilePage />} />

              {/* Credentials */}
                              <Route path="/credentials" element={<CredentialsDashboardPage />} />

                              {/* Admin */}
                              <Route path="/admin/schools" element={<SchoolManagementPage />} />

                              {/* Settings */}
                              <Route path="/settings" element={<SettingsPage />} />
                              <Route path="/settings/workspace" element={<WorkspaceProfilePage />} />
                              <Route path="/settings/escalation" element={<EscalationRulesPage />} />

                              {/* Safety Module */}
                              <Route path="/safety" element={<SafetyDashboardPage />} />

                              {/* Equipment & Fleet */}
                              <Route path="/equipment" element={<EquipmentDashboardPage />} />
                              <Route path="/equipment/setup" element={<EquipmentSetupPage />} />

                              {/* Executive Suite */}
                              <Route path="/reports/executive" element={<ExecutiveSuitePage />} />

                              {/* CaseIQ */}
                              <Route path="/case-review" element={<CaseReviewPage />} />

                              {/* Client Portals */}
                              <Route path="/portals" element={<PortalsDashboardPage />} />
                              <Route path="/portals/:id" element={<PortalManagePage />} />
                              
                              {/* 404 */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ModuleProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
