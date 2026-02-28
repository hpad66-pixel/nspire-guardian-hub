import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { HardHat, Plus, Search, AlertTriangle, Shield, Lock, ArrowRight } from 'lucide-react';
import { useContractors, useContractorWorkOrders, useContractorPayApps, computeContractorScore, type Contractor } from '@/hooks/useContractors';
import { ContractorFormSheet } from '@/components/projects/ContractorFormSheet';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function ScoreBadge({ score }: { score: number }) {
  let bg: string, label: string;
  if (score >= 80) { bg = 'bg-emerald-500'; label = 'EXCELLENT'; }
  else if (score >= 60) { bg = 'bg-amber-500'; label = 'GOOD'; }
  else if (score >= 40) { bg = 'bg-orange-500'; label = 'FAIR'; }
  else { bg = 'bg-destructive'; label = 'POOR'; }

  return (
    <span className={`${bg} text-white text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5`}>
      <span className="font-mono text-sm">{score}</span>
      <span className="text-[10px] tracking-wider">{label}</span>
    </span>
  );
}

function ContractorCard({ contractor }: { contractor: Contractor }) {
  const navigate = useNavigate();
  const { data: workOrders = [] } = useContractorWorkOrders(contractor.id);
  const { data: payApps = [] } = useContractorPayApps(contractor.id);
  const score = computeContractorScore(workOrders as any, payApps, contractor);

  const statusColor = contractor.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    : contractor.status === 'suspended' ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/contractors/${contractor.id}`)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{contractor.name}</p>
            {contractor.company && <p className="text-xs text-muted-foreground truncate">{contractor.company}</p>}
          </div>
          <ScoreBadge score={score.performanceScore} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {contractor.trade && <Badge variant="secondary" className="text-[10px]">{contractor.trade}</Badge>}
          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>{contractor.status}</Badge>
          {score.licenseExpiringSoon && (
            <span className="text-warning flex items-center gap-0.5 text-[10px]"><Lock className="h-3 w-3" /> License</span>
          )}
          {score.insuranceExpiringSoon && (
            <span className="text-warning flex items-center gap-0.5 text-[10px]"><Shield className="h-3 w-3" /> Insurance</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-mono font-bold">{score.onTimeRate}%</p>
            <p className="text-[10px] text-muted-foreground">On-Time</p>
          </div>
          <div>
            <p className="text-lg font-mono font-bold">{score.punchResolutionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Punch Res.</p>
          </div>
          <div>
            <p className="text-lg font-mono font-bold">{score.openWorkOrders}</p>
            <p className="text-[10px] text-muted-foreground">Open WOs</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>On-Time Completion</span>
            <span>{score.onTimeRate}%</span>
          </div>
          <Progress value={score.onTimeRate} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-[11px] text-muted-foreground">
            {score.totalPayApps > 0 ? `${score.totalPayApps} pay apps` : 'No pay apps'}
          </span>
          <span className="text-xs text-primary flex items-center gap-1">
            Details <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContractorsPage() {
  const { data: contractors = [], isLoading } = useContractors();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return contractors.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.company || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (tradeFilter !== 'all' && c.trade !== tradeFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [contractors, search, tradeFilter, statusFilter]);

  const expiringLicense = contractors.filter(c => c.license_expiry && (new Date(c.license_expiry).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000 && new Date(c.license_expiry).getTime() > Date.now()).length;
  const expiringInsurance = contractors.filter(c => c.insurance_expiry && (new Date(c.insurance_expiry).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000 && new Date(c.insurance_expiry).getTime() > Date.now()).length;
  const suspendedCount = contractors.filter(c => c.status === 'suspended').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HardHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Contractors</h1>
            <p className="text-sm text-muted-foreground">{contractors.length} registered</p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Contractor</Button>
      </div>

      {/* Alerts */}
      {(expiringLicense > 0 || expiringInsurance > 0 || suspendedCount > 0) && (
        <div className="space-y-2">
          {expiringLicense > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {expiringLicense} contractor{expiringLicense > 1 ? 's have' : ' has'} expiring licenses
            </div>
          )}
          {expiringInsurance > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm text-warning">
              <Shield className="h-4 w-4 flex-shrink-0" />
              {expiringInsurance} contractor{expiringInsurance > 1 ? 's have' : ' has'} expiring insurance
            </div>
          )}
          {suspendedCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {suspendedCount} contractor{suspendedCount > 1 ? 's' : ''} suspended
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or company..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {['Plumbing', 'Electrical', 'Sewer', 'General', 'Civil', 'HVAC', 'Roofing', 'Other'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <HardHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {contractors.length === 0 ? 'No contractors yet' : 'No contractors match filters'}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {contractors.length === 0 ? 'Add your first contractor to start tracking performance.' : 'Try adjusting your search or filters.'}
          </p>
          {contractors.length === 0 && (
            <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Contractor</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => <ContractorCard key={c.id} contractor={c} />)}
        </div>
      )}

      <ContractorFormSheet open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
