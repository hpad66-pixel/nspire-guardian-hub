import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MaintenanceRequest } from '@/hooks/useMaintenanceRequests';

interface EmergencyAlertBannerProps {
  requests: MaintenanceRequest[];
  onViewRequest: (request: MaintenanceRequest) => void;
}

export function EmergencyAlertBanner({ requests, onViewRequest }: EmergencyAlertBannerProps) {
  const emergencyRequests = requests.filter(
    (r) => r.is_emergency && r.status === 'new'
  );

  if (emergencyRequests.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-destructive/10 border border-destructive/50 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">
              {emergencyRequests.length} Emergency Request{emergencyRequests.length > 1 ? 's' : ''} Pending
            </h3>
            <div className="mt-2 space-y-2">
              {emergencyRequests.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between bg-background/80 rounded-md p-2"
                >
                  <div>
                    <span className="font-mono text-sm">
                      MR-{String(request.ticket_number).padStart(4, '0')}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-sm">
                      {request.caller_unit_number && `Unit ${request.caller_unit_number} - `}
                      {request.issue_category}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onViewRequest(request)}
                  >
                    Assign Now
                  </Button>
                </div>
              ))}
              {emergencyRequests.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{emergencyRequests.length - 3} more emergency requests
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
