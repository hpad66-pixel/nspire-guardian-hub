import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { ChangeOrdersList } from './ChangeOrdersList';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];

interface ProjectFinancialsProps {
  project: ProjectRow & { property?: { name: string } };
  changeOrders: ChangeOrderRow[];
}

export function ProjectFinancials({ project, changeOrders }: ProjectFinancialsProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const originalBudget = Number(project.budget) || 0;
  const spent = Number(project.spent) || 0;

  const approvedCOs = changeOrders.filter((co) => co.status === 'approved');
  const pendingCOs = changeOrders.filter((co) => co.status === 'pending');
  const rejectedCOs = changeOrders.filter((co) => co.status === 'rejected');

  const approvedAmount = approvedCOs.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
  const pendingAmount = pendingCOs.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

  const adjustedBudget = originalBudget + approvedAmount;
  const remaining = adjustedBudget - spent;
  const spentPercentage = adjustedBudget > 0 ? Math.round((spent / adjustedBudget) * 100) : 0;

  const isOverBudget = remaining < 0;
  const isNearBudget = remaining >= 0 && remaining < adjustedBudget * 0.1;

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Original budget and change order adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget Flow */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Original</p>
                <p className="text-xl font-bold">{formatCurrency(originalBudget)}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm text-green-500">+{formatCurrency(approvedAmount)}</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Adjusted</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(adjustedBudget)}</p>
              </div>
            </div>

            {/* Spending Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className="text-sm font-medium">
                  {formatCurrency(spent)} of {formatCurrency(adjustedBudget)}
                </span>
              </div>
              <Progress
                value={Math.min(spentPercentage, 100)}
                className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : isNearBudget ? '[&>div]:bg-amber-500' : ''}`}
              />
              <div className="flex items-center justify-between text-sm">
                <span className={isOverBudget ? 'text-destructive' : 'text-muted-foreground'}>
                  {spentPercentage}% spent
                </span>
                <span
                  className={
                    isOverBudget
                      ? 'text-destructive'
                      : isNearBudget
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }
                >
                  {isOverBudget ? 'Over budget by ' : 'Remaining: '}
                  {formatCurrency(Math.abs(remaining))}
                </span>
              </div>
            </div>

            {/* Status Alert */}
            {isOverBudget && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Budget Exceeded</p>
                  <p className="text-xs text-muted-foreground">
                    Spending has exceeded the adjusted budget
                  </p>
                </div>
              </div>
            )}
            {isNearBudget && !isOverBudget && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Nearing Budget</p>
                  <p className="text-xs text-muted-foreground">
                    Less than 10% of budget remaining
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Change Order Summary</CardTitle>
            <CardDescription>Impact of scope changes on budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-500">{approvedCOs.length}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-500">{pendingCOs.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-lg font-bold text-destructive">{rejectedCOs.length}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved Amount</span>
                <Badge variant="outline" className="text-green-500">
                  +{formatCurrency(approvedAmount)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Approval</span>
                <Badge variant="outline" className="text-amber-500">
                  +{formatCurrency(pendingAmount)}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Potential Total</span>
                <span className="font-bold">{formatCurrency(adjustedBudget + pendingAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Orders List */}
      <ChangeOrdersList projectId={project.id} changeOrders={changeOrders} />
    </div>
  );
}
