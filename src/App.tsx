import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import InspectionsDashboard from "./pages/inspections/InspectionsDashboard";
import OutsideInspections from "./pages/inspections/OutsideInspections";
import InsideInspections from "./pages/inspections/InsideInspections";
import UnitInspections from "./pages/inspections/UnitInspections";
import ProjectsDashboard from "./pages/projects/ProjectsDashboard";
import SettingsPage from "./pages/settings/SettingsPage";
import PropertiesPage from "./pages/core/PropertiesPage";
import IssuesPage from "./pages/core/IssuesPage";
import PlaceholderPage from "./pages/core/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ModuleProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Core Platform */}
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/units" element={<PlaceholderPage title="Units" description="Unit inventory management" />} />
              <Route path="/assets" element={<PlaceholderPage title="Assets" description="Asset inventory and tracking" />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/documents" element={<PlaceholderPage title="Documents" description="Document library and management" />} />
              <Route path="/people" element={<PlaceholderPage title="People" description="User and role management" />} />
              
              {/* NSPIRE Inspections Module */}
              <Route path="/inspections" element={<InspectionsDashboard />} />
              <Route path="/inspections/outside" element={<OutsideInspections />} />
              <Route path="/inspections/inside" element={<InsideInspections />} />
              <Route path="/inspections/units" element={<UnitInspections />} />
              
              {/* Projects Module */}
              <Route path="/projects" element={<ProjectsDashboard />} />
              
              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </ModuleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
