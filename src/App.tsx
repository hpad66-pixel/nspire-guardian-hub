import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import FeaturesPage from "./pages/FeaturesPage";
import AuthPage from "./pages/auth/AuthPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import InspectionsDashboard from "./pages/inspections/InspectionsDashboard";
import OutsideInspections from "./pages/inspections/OutsideInspections";
import InsideInspections from "./pages/inspections/InsideInspections";
import UnitInspections from "./pages/inspections/UnitInspections";
import ProjectsDashboard from "./pages/projects/ProjectsDashboard";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import ProposalsPage from "./pages/projects/ProposalsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import PropertiesPage from "./pages/core/PropertiesPage";
import UnitsPage from "./pages/core/UnitsPage";
import IssuesPage from "./pages/core/IssuesPage";
import WorkOrdersPage from "./pages/workorders/WorkOrdersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import PropertyArchivesPage from "./pages/documents/PropertyArchivesPage";
import ActivityLogPage from "./pages/settings/ActivityLogPage";
import NotFound from "./pages/NotFound";
import AssetsPage from "./pages/assets/AssetsPage";
import DailyGroundsPage from "./pages/inspections/DailyGroundsPage";
import InspectionReviewPage from "./pages/inspections/InspectionReviewPage";
import InspectionHistoryPage from "./pages/inspections/InspectionHistoryPage";
import MailboxPage from "./pages/inbox/MailboxPage";
import MessagesPage from "./pages/messages/MessagesPage";
import PermitsDashboard from "./pages/permits/PermitsDashboard";
import PermitDetailPage from "./pages/permits/PermitDetailPage";
import PeoplePage from "./pages/people/PeoplePage";
import OccupancyPage from "./pages/occupancy/OccupancyPage";
import QRScannerPage from "./pages/qr/QRScannerPage";
import TrainingPage from "./pages/training/TrainingPage";
import ContactsPage from "./pages/crm/ContactsPage";
import AcceptInvitePage from "./pages/auth/AcceptInvitePage";
import VoiceAgentDashboard from "./pages/voice-agent/VoiceAgentDashboard";
import OrganizationsPage from "./pages/organizations/OrganizationsPage";
import InstallPage from "./pages/InstallPage";
import LandingPageAlt from "./pages/LandingPageAlt";

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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ModuleProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPageAlt />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/home-alt" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                
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
                        <Route path="/training" element={<TrainingPage />} />
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
                        
                        {/* Settings */}
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              </Routes>
            </BrowserRouter>
          </ModuleProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
