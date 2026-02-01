import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/auth/AuthPage";
import InspectionsDashboard from "./pages/inspections/InspectionsDashboard";
import OutsideInspections from "./pages/inspections/OutsideInspections";
import InsideInspections from "./pages/inspections/InsideInspections";
import UnitInspections from "./pages/inspections/UnitInspections";
import ProjectsDashboard from "./pages/projects/ProjectsDashboard";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import SettingsPage from "./pages/settings/SettingsPage";
import PropertiesPage from "./pages/core/PropertiesPage";
import UnitsPage from "./pages/core/UnitsPage";
import IssuesPage from "./pages/core/IssuesPage";
import WorkOrdersPage from "./pages/workorders/WorkOrdersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import ActivityLogPage from "./pages/settings/ActivityLogPage";
import PlaceholderPage from "./pages/core/PlaceholderPage";
import NotFound from "./pages/NotFound";
import AssetsPage from "./pages/assets/AssetsPage";
import DailyGroundsPage from "./pages/inspections/DailyGroundsPage";
import InspectionReviewPage from "./pages/inspections/InspectionReviewPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ModuleProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        {/* Dashboard */}
                        <Route path="/" element={<Dashboard />} />
                        
                        {/* Core Platform */}
                        <Route path="/properties" element={<PropertiesPage />} />
                        <Route path="/units" element={<UnitsPage />} />
                        <Route path="/assets" element={<AssetsPage />} />
                        <Route path="/issues" element={<IssuesPage />} />
                        <Route path="/work-orders" element={<WorkOrdersPage />} />
                        <Route path="/documents" element={<DocumentsPage />} />
                        <Route path="/people" element={<PlaceholderPage title="People" description="User and role management" />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/settings/activity-log" element={<ActivityLogPage />} />
                        
                        {/* NSPIRE Inspections Module */}
                        <Route path="/inspections" element={<InspectionsDashboard />} />
                        <Route path="/inspections/daily" element={<DailyGroundsPage />} />
                        <Route path="/inspections/review" element={<InspectionReviewPage />} />
                        <Route path="/inspections/outside" element={<OutsideInspections />} />
                        <Route path="/inspections/inside" element={<InsideInspections />} />
                        <Route path="/inspections/units" element={<UnitInspections />} />
                        
                        {/* Projects Module */}
                        <Route path="/projects" element={<ProjectsDashboard />} />
                        <Route path="/projects/:id" element={<ProjectDetailPage />} />
                        
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
);

export default App;
