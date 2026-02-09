import { useMemo, useState } from 'react';
import { Phone, Filter, RefreshCw, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceAgentStats } from '@/components/voice-agent/VoiceAgentStats';
import { VoiceAgentWidget } from '@/components/voice-agent/VoiceAgentWidget';
import { RequestQueue } from '@/components/voice-agent/RequestQueue';
import { RequestDetailSheet } from '@/components/voice-agent/RequestDetailSheet';
import { EmergencyAlertBanner } from '@/components/voice-agent/EmergencyAlertBanner';
import { useMaintenanceRequests, MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useProperties } from '@/hooks/useProperties';
import { toast } from 'sonner';

export default function VoiceAgentDashboard() {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests, isLoading, refetch } = useMaintenanceRequests(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: properties = [] } = useProperties();

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const handleSelectRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };

  const handleStartCall = () => {
    if (properties.length === 0) {
      toast.error('No affiliated properties found');
      return;
    }

    if (properties.length === 1) {
      setSelectedPropertyId(properties[0].id);
      setCallDialogOpen(true);
      return;
    }

    setPropertySelectOpen(true);
  };

  const handleContinueFromPropertySelect = () => {
    if (!selectedPropertyId) {
      toast.error('Select a property to continue');
      return;
    }
    setPropertySelectOpen(false);
    setCallDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Phone className="w-8 h-8 text-primary" />
            Voice Agent Console
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered maintenance request handling
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleStartCall}>
            <Mic className="w-4 h-4 mr-2" />
            Start Call
          </Button>
        </div>
      </div>

      {/* Stats */}
      <VoiceAgentStats />

      {/* Emergency Banner */}
      {requests && (
        <EmergencyAlertBanner 
          requests={requests} 
          onViewRequest={handleSelectRequest}
        />
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Request Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Maintenance Requests</h2>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <RequestQueue
              requests={requests || []}
              onSelect={handleSelectRequest}
              selectedId={selectedRequest?.id}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" onClick={handleStartCall}>
                <Mic className="w-4 h-4" />
                Start Call
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Start a call to capture a maintenance request
              </p>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issue Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {requests && requests.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    requests.reduce((acc, r) => {
                      acc[r.issue_category] = (acc[r.issue_category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                Emergency requests are automatically flagged when callers mention keywords like 
                "flood", "fire", "gas leak", or "no heat". These appear at the top of the queue.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={propertySelectOpen} onOpenChange={setPropertySelectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPropertySelectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromPropertySelect}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Agent Call</DialogTitle>
          </DialogHeader>
          <VoiceAgentWidget
            propertyId={selectedProperty?.id || null}
            propertyName={selectedProperty?.name || null}
            onClose={() => setCallDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Request Detail Sheet */}
      <RequestDetailSheet
        request={selectedRequest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
