import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  DollarSign,
  FileText,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
} from 'lucide-react';
import { useApproveChangeOrder, useRejectChangeOrder } from '@/hooks/useChangeOrders';
import { ChangeOrderDialog } from './ChangeOrderDialog';
import type { Database } from '@/integrations/supabase/types';

type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];

interface ChangeOrdersListProps {
  projectId: string;
  changeOrders: ChangeOrderRow[];
}

const statusConfig = {
  draft: {
    icon: Edit,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Draft',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Pending Approval',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Rejected',
  },
};

export function ChangeOrdersList({ projectId, changeOrders }: ChangeOrdersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCO, setEditingCO] = useState<ChangeOrderRow | null>(null);

  const approveMutation = useApproveChangeOrder();
  const rejectMutation = useRejectChangeOrder();

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sortedOrders = [...changeOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalApproved = changeOrders
    .filter((co) => co.status === 'approved')
    .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

  const totalPending = changeOrders
    .filter((co) => co.status === 'pending')
    .reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Change Orders</CardTitle>
            <CardDescription>
              Budget adjustments and scope changes
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingCO(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Change Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400">Approved</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalApproved)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 dark:text-amber-400">Pending</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No change orders yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => { setEditingCO(null); setDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Change Order
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((co) => {
              const config = statusConfig[co.status as keyof typeof statusConfig];
              const Icon = config.icon;

              return (
                <div
                  key={co.id}
                  className="p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{co.title}</h4>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        {co.description && (
                          <p className="text-sm text-muted-foreground mt-1">{co.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Created {format(new Date(co.created_at), 'MMM d, yyyy')}</span>
                          {co.approved_at && (
                            <span>
                              Approved {format(new Date(co.approved_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(Number(co.amount))}
                      </p>
                      {co.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectMutation.mutate(co.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(co.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                      {co.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setEditingCO(co);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ChangeOrderDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCO(null);
        }}
        projectId={projectId}
        changeOrder={editingCO}
      />
    </Card>
  );
}
