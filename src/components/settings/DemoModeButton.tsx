import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SeedResult {
  properties: number;
  issues: number;
  workOrders: number;
  projects: number;
  contractors: number;
  credentials: number;
  equipment: number;
  contacts: number;
  safetyIncidents: number;
  complianceEvents: number;
  maintenanceRequests: number;
}

export function DemoModeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Seed failed');
      setResult(data.summary);
      toast.success('Demo data loaded successfully! Refresh to see changes.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load demo data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Demo Mode
        </CardTitle>
        <CardDescription>
          Populate your workspace with realistic mock data across all modules — properties, work orders, issues, projects, equipment, credentials, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 space-y-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Data loaded successfully
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-green-700 dark:text-green-400">
              <span>{result.properties} properties</span>
              <span>{result.issues} issues</span>
              <span>{result.workOrders} work orders</span>
              <span>{result.projects} projects</span>
              <span>{result.contractors} contractors</span>
              <span>{result.equipment} equipment</span>
              <span>{result.contacts} contacts</span>
              <span>{result.credentials} credentials</span>
              <span>{result.safetyIncidents} incidents</span>
              <span>{result.complianceEvents} compliance events</span>
              <span>{result.maintenanceRequests} maint. requests</span>
            </div>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Database className="h-4 w-4" />
              Load Demo Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Load Demo Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will populate your workspace with realistic sample data across all modules. 
                Existing data will not be deleted. All workspace modules will be activated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeed}>Load Demo Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
