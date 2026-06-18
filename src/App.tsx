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
import { PortalProtectedRoute } from "@/components/portal/PortalProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { flushOfflineQueue } from '@/lib/flushOfflineQueue';

// Pages — lazy loaded for code splitting
const LandingPageAlt = lazy(() => import('./pages/LandingPageAlt'));
const RootRedirect = lazy(() => import('./pages/RootRedirect'));
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
const TrainingDashboardPage = lazy(() => import('./pages/training/TrainingDashboardPage'));
const CertificateSharePage = lazy(() => import('./pages/training/CertificateSharePage'));
const ContactsPage = lazy(() => import('./pages/crm/ContactsPage'));
const VoiceAgentDashboard = lazy(() => import('./pages/voice-agent/VoiceAgentDashboard'));
const OrganizationsPage = lazy(() => import('./pages/organizations/OrganizationsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PropertyAnalyticsPage = lazy(() => import('./pages/core/PropertyAnalyticsPage'));
const PropertyGalleryPage = lazy(() => import('./pages/core/PropertyGalleryPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CredentialsDashboardPage = lazy(() => import('./pages/credentials/CredentialsDashboardPage'));
const CredentialSharePage = lazy(() => import('./pages/credentials/CredentialSharePage'));
const SchoolManagementPage = lazy(() => import('./pages/admin/SchoolManagementPage'));
const FeatureRegistryPage = lazy(() => import('./pages/admin/FeatureRegistryPage'));
const SafetyDashboardPage = lazy(() => import('./pages/safety/SafetyDashboardPage'));
const EquipmentDashboardPage = lazy(() => import('./pages/equipment/EquipmentDashboardPage'));
const EquipmentSetupPage = lazy(() => import('./pages/equipment/EquipmentSetupPage'));
const PortalsDashboardPage = lazy(() => import('./pages/portals/PortalsDashboardPage'));
const PortalManagePage = lazy(() => import('./pages/portals/PortalManagePage'));
const PortalLoginPage = lazy(() => import('./pages/portal/PortalLoginPage'));
const PortalAuthPage = lazy(() => import('./pages/portal/PortalAuthPage'));
const PortalWelcomePage = lazy(() => import('./pages/portal/PortalWelcomePage'));
const PortalHomePage = lazy(() => import('./pages/portal/PortalHomePage'));
const PortalSchedulePage = lazy(() => import('./pages/portal/PortalSchedulePage'));
const CaseReviewPage = lazy(() => import('./pages/case-review/CaseReviewPage'));

// ───────── Procore Lite · Phase 1 (A1–A5) ─────────
const PermissionTemplatesPage = lazy(() => import('./pages/admin/PermissionTemplatesPage'));
const PermissionTemplateDetailPage = lazy(() => import('./pages/admin/PermissionTemplateDetailPage'));
const DistributionListsPage = lazy(() => import('./pages/settings/DistributionListsPage'));
const MyCourtPage = lazy(() => import('./pages/dashboard/MyCourtPage'));
const CostCodeLibrariesPage = lazy(() => import('./pages/admin/CostCodeLibrariesPage'));
const CostCodeLibraryEditor = lazy(() => import('./pages/admin/CostCodeLibraryEditor'));
const WorkflowsPage = lazy(() => import('./pages/admin/WorkflowsPage'));
const ProjectCostCodesPage = lazy(() => import('./pages/projects/ProjectCostCodesPage'));
const SubmittalPackagesPage = lazy(() => import('./pages/projects/SubmittalPackagesPage'));
const SubmittalRegisterPage = lazy(() => import('./pages/projects/SubmittalRegisterPage'));

// ───────── Procore Lite · Phase 1 (A6) ─────────
const BillingPage = lazy(() => import('./pages/admin/BillingPage'));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'));

// ───────── Procore Lite · Phase 1 (A7) ─────────
const SSOConfigPage = lazy(() => import('./pages/admin/SSOConfigPage'));
const SCIMConfigPage = lazy(() => import('./pages/admin/SCIMConfigPage'));

// ───────── Procore Lite · Phase 4 (E3, F1, F2, F3) ─────────
const ProcoreReportsPage = lazy(() => import('./pages/reports/ProcoreReportsPage'));
const ProcoreDashboardsPage = lazy(() => import('./pages/dashboards/DashboardsPage'));
const SubDashboardPage = lazy(() => import('./pages/portal/sub/SubDashboardPage'));
const OwnerDashboardPage = lazy(() => import('./pages/portal/owner/OwnerDashboardPage'));
const SubCommitmentsPage = lazy(() => import('./pages/portal/sub/SubCommitmentsPage'));
const SubCommitmentDetailPage = lazy(() => import('./pages/portal/sub/SubCommitmentDetailPage'));
const SubInvoiceBuilderPage = lazy(() => import('./pages/portal/sub/SubInvoiceBuilderPage'));
const SubRfisPage = lazy(() => import('./pages/portal/sub/SubRfisPage'));
const SubSubmittalsPage = lazy(() => import('./pages/portal/sub/SubSubmittalsPage'));
const OwnerContractPage = lazy(() => import('./pages/portal/owner/OwnerContractPage'));
const OwnerOcoApprovalPage = lazy(() => import('./pages/portal/owner/OwnerOcoApprovalPage'));
const OwnerPayAppApprovalPage = lazy(() => import('./pages/portal/owner/OwnerPayAppApprovalPage'));
const OwnerSchedulePage = lazy(() => import('./pages/portal/owner/OwnerSchedulePage'));
const OwnerReportsPage = lazy(() => import('./pages/portal/owner/OwnerReportsPage'));
const ApiClientsPage = lazy(() => import('./pages/settings/api/ApiClientsPage'));
const WebhooksPage = lazy(() => import('./pages/settings/api/WebhooksPage'));
const WebhookDeliveriesPage = lazy(() => import('./pages/settings/api/WebhookDeliveriesPage'));
const ApiDocsPage = lazy(() => import('./pages/developer/ApiDocsPage'));
const DashboardViewPage = lazy(() => import('./pages/dashboards/DashboardViewPage'));
const ReportBuilderPage = lazy(() => import('./pages/reports/ReportBuilderPage'));

// ───────── Procore Lite · Phase 3 (D1–D6 Financial Cascade) ─────────
const PrimeContractPage = lazy(() => import('./pages/projects/financial/PrimeContractPage'));
const PhaseThreeCommitmentsPage = lazy(() => import('./pages/projects/financial/CommitmentsPage'));
const ChangeEventsPage = lazy(() => import('./pages/projects/financial/ChangeEventsPage'));
const PhaseThreeChangeOrdersPage = lazy(() => import('./pages/projects/financial/ChangeOrdersPage'));
const DirectCostsPage = lazy(() => import('./pages/projects/financial/DirectCostsPage'));
const InvoicesPage = lazy(() => import('./pages/projects/financial/InvoicesPage'));
const BudgetPage = lazy(() => import('./pages/projects/financial/BudgetPage'));
const PaymentsPage = lazy(() => import('./pages/projects/financial/PaymentsPage'));
const CommitmentDetailPage = lazy(() => import('./pages/projects/financial/CommitmentDetailPage'));
const PayAppDetailPage = lazy(() => import('./pages/projects/financial/PayAppDetailPage'));
const ChangeEventDetailPage = lazy(() => import('./pages/projects/financial/ChangeEventDetailPage'));
const ChangeOrderDetailPage = lazy(() => import('./pages/projects/financial/ChangeOrderDetailPage'));

// ───────── Procore Lite · Phase 2 (B1–B5, C1–C5, E1–E2) ─────────
const ProjectDirectoryPage = lazy(() => import('./pages/projects/ProjectDirectoryPage'));
const DrawingsPage = lazy(() => import('./pages/projects/DrawingsPage'));
const DrawingViewerPage = lazy(() => import('./pages/projects/DrawingViewerPage'));
const SpecificationsPage = lazy(() => import('./pages/projects/SpecificationsPage'));
const PhotosPage = lazy(() => import('./pages/projects/PhotosPage'));
const ProjectDocumentsPage = lazy(() => import('./pages/projects/ProjectDocumentsPage'));
const TransmittalsPage = lazy(() => import('./pages/projects/TransmittalsPage'));
const PunchListPage = lazy(() => import('./pages/projects/PunchListPage'));
const DailyLogPage = lazy(() => import('./pages/projects/DailyLogPage'));
const MeetingsProcorePage = lazy(() => import('./pages/projects/MeetingsProcorePage'));
const MeetingRunPage = lazy(() => import('./pages/projects/MeetingRunPage'));
const MeetingTemplatesPage = lazy(() => import('./pages/projects/MeetingTemplatesPage'));
const SchedulePage = lazy(() => import('./pages/projects/SchedulePage'));
const IncidentsPage = lazy(() => import('./pages/projects/IncidentsPage'));
const ProjectRepositoryPage = lazy(() => import('./pages/projects/ProjectRepositoryPage'));
const ContractListPage = lazy(() => import('./pages/projects/contracts/ContractListPage'));
const ContractDashboardPage = lazy(() => import('./pages/projects/contracts/ContractDashboardPage'));
const ContractFormPage = lazy(() => import('./pages/projects/contracts/ContractFormPage'));

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
                    <Route path="/landing" element={<LandingPageAlt />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/home-alt" element={<Navigate to="/" replace />} />
                    <Route path="/home-legacy" element={<Navigate to="/" replace />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                     <Route path="/portal/:slug" element={<PortalLoginPage />} />
                     <Route path="/portal/:slug/auth" element={<PortalAuthPage />} />
                     <Route path="/portal/:slug/welcome" element={<PortalWelcomePage />} />
                     <Route path="/portal/:slug/home" element={<PortalHomePage />} />
                     <Route path="/portal/:slug/schedule" element={<PortalSchedulePage />} />
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
                              
                              {/* Profile */}
                              <Route path="/profile" element={<ProfilePage />} />

              {/* Credentials */}
                              <Route path="/credentials" element={<CredentialsDashboardPage />} />

                              {/* Admin */}
                              <Route path="/admin/schools" element={<SchoolManagementPage />} />
                              <Route path="/admin/registry" element={<FeatureRegistryPage />} />

                              {/* Settings */}
                              <Route path="/settings" element={<SettingsPage />} />
                              <Route path="/settings/workspace" element={<WorkspaceProfilePage />} />

                              {/* Safety Module */}
                              <Route path="/safety" element={<SafetyDashboardPage />} />

                              {/* Equipment & Fleet */}
                              <Route path="/equipment" element={<EquipmentDashboardPage />} />
                              <Route path="/equipment/setup" element={<EquipmentSetupPage />} />

                              {/* CaseIQ */}
                              <Route path="/case-review" element={<CaseReviewPage />} />

                              {/* Client Portals */}
                              <Route path="/portals" element={<PortalsDashboardPage />} />
                              <Route path="/portals/:id" element={<PortalManagePage />} />
                              
                              {/* ───── Procore Lite · Phase 1 (A1–A5) ───── */}
                              <Route path="/dashboard/my-court" element={<MyCourtPage />} />
                              <Route path="/admin/permission-templates" element={<PermissionTemplatesPage />} />
                              <Route path="/admin/permission-templates/:id" element={<PermissionTemplateDetailPage />} />
                              <Route path="/settings/distribution-lists" element={<DistributionListsPage />} />
                              <Route path="/admin/cost-codes" element={<CostCodeLibrariesPage />} />
                              <Route path="/admin/cost-codes/editor" element={<CostCodeLibraryEditor />} />
                              <Route path="/admin/workflows" element={<WorkflowsPage />} />
                              <Route path="/projects/:projectId/cost-codes" element={<ProjectCostCodesPage />} />
                              <Route path="/projects/:projectId/submittals/packages" element={<SubmittalPackagesPage />} />
                              <Route path="/projects/:projectId/submittals/register" element={<SubmittalRegisterPage />} />
                              <Route path="/admin/billing" element={<BillingPage />} />
                              <Route path="/admin/sso" element={<SSOConfigPage />} />
                              <Route path="/admin/scim" element={<SCIMConfigPage />} />

                              {/* ───── Procore Lite · Phase 2 ───── */}
                              <Route path="/projects/:projectId/directory" element={<ProjectDirectoryPage />} />
                              <Route path="/projects/:projectId/drawings" element={<DrawingsPage />} />
                              <Route path="/projects/:projectId/drawings/:drawingId" element={<DrawingViewerPage />} />
                              <Route path="/projects/:projectId/specifications" element={<SpecificationsPage />} />
                              <Route path="/projects/:projectId/photos" element={<PhotosPage />} />
                              <Route path="/projects/:projectId/documents" element={<ProjectDocumentsPage />} />
                              <Route path="/projects/:projectId/transmittals" element={<TransmittalsPage />} />
                              <Route path="/projects/:projectId/punch" element={<PunchListPage />} />
                              <Route path="/projects/:projectId/daily-log" element={<DailyLogPage />} />
                              <Route path="/projects/:projectId/meetings" element={<MeetingsProcorePage />} />
                              <Route path="/projects/:projectId/repository" element={<ProjectRepositoryPage />} />
                              <Route path="/projects/:projectId/contracts" element={<ContractListPage />} />
                              <Route path="/projects/:projectId/contracts/new" element={<ContractFormPage />} />
                              <Route path="/projects/:projectId/contracts/:contractId" element={<ContractDashboardPage />} />
                              <Route path="/projects/:projectId/contracts/:contractId/edit" element={<ContractFormPage />} />
                              <Route path="/projects/:projectId/meetings/templates" element={<MeetingTemplatesPage />} />
                              <Route path="/projects/:projectId/meetings/:meetingId" element={<MeetingRunPage />} />
                              <Route path="/projects/:projectId/schedule" element={<SchedulePage />} />
                              <Route path="/projects/:projectId/incidents" element={<IncidentsPage />} />

                              {/* ───── Procore Lite · Phase 3 (Financial Cascade) ───── */}
                              <Route path="/projects/:projectId/financials/prime-contract" element={<PrimeContractPage />} />
                              <Route path="/projects/:projectId/financials/commitments" element={<PhaseThreeCommitmentsPage />} />
                              <Route path="/projects/:projectId/financials/change-events" element={<ChangeEventsPage />} />
                              <Route path="/projects/:projectId/financials/change-orders" element={<PhaseThreeChangeOrdersPage />} />
                              <Route path="/projects/:projectId/financials/direct-costs" element={<DirectCostsPage />} />
                              <Route path="/projects/:projectId/financials/invoices" element={<InvoicesPage />} />
                              <Route path="/projects/:projectId/financials/budget" element={<BudgetPage />} />
                              <Route path="/projects/:projectId/financials/payments" element={<PaymentsPage />} />
                              <Route path="/projects/:projectId/financials/commitments/:commitmentId" element={<CommitmentDetailPage />} />
                              <Route path="/projects/:projectId/financials/prime-contract/pay-apps/:payAppId" element={<PayAppDetailPage />} />
                              <Route path="/projects/:projectId/financials/change-events/:eventId" element={<ChangeEventDetailPage />} />
                              <Route path="/projects/:projectId/financials/cos/:coId" element={<ChangeOrderDetailPage />} />

                              {/* ───── Procore Lite · Phase 4 ───── */}
                              <Route path="/reports/procore" element={<ProcoreReportsPage />} />
                              <Route path="/dashboards/procore" element={<ProcoreDashboardsPage />} />
                              {/* G3 · Subcontractor portal — auth + role + plan gated.
                                   Path prefix `/sub-portal/*` avoids conflict with the
                                   legacy customer-facing `/portal/:slug` magic-link login. */}
                              <Route element={<PortalProtectedRoute role="subcontractor" feature="sub_portal" />}>
                                <Route path="/sub-portal" element={<SubDashboardPage />} />
                                <Route path="/sub-portal/commitments" element={<SubCommitmentsPage />} />
                                <Route path="/sub-portal/commitments/:commitmentId" element={<SubCommitmentDetailPage />} />
                                <Route path="/sub-portal/commitments/:commitmentId/invoices/new" element={<SubInvoiceBuilderPage />} />
                                <Route path="/sub-portal/rfis" element={<SubRfisPage />} />
                                <Route path="/sub-portal/submittals" element={<SubSubmittalsPage />} />
                              </Route>
                              {/* G3 · Owner portal — auth + role + plan gated. */}
                              <Route element={<PortalProtectedRoute role="owner" feature="owner_portal" />}>
                                <Route path="/owner-portal" element={<OwnerDashboardPage />} />
                                <Route path="/owner-portal/contract" element={<OwnerContractPage />} />
                                <Route path="/owner-portal/cos/:coId" element={<OwnerOcoApprovalPage />} />
                                <Route path="/owner-portal/pay-apps/:payAppId" element={<OwnerPayAppApprovalPage />} />
                                <Route path="/owner-portal/schedule" element={<OwnerSchedulePage />} />
                                <Route path="/owner-portal/reports" element={<OwnerReportsPage />} />
                              </Route>
                              <Route path="/settings/api/clients" element={<ApiClientsPage />} />
                              <Route path="/settings/api/webhooks" element={<WebhooksPage />} />
                              <Route path="/settings/api/webhooks/:id/deliveries" element={<WebhookDeliveriesPage />} />
                              <Route path="/developer/api" element={<ApiDocsPage />} />
                              <Route path="/dashboards/:dashboardId" element={<DashboardViewPage />} />
                              <Route path="/reports/new" element={<ReportBuilderPage />} />

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
