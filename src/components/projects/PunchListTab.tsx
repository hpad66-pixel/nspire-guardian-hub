import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  Wrench,
  User,
  Sparkles,
  Send,
} from 'lucide-react';
import { usePunchItemsByProject, usePunchItemStats, type PunchItem } from '@/hooks/usePunchItems';
import { useProject } from '@/hooks/useProjects';
import { PunchItemDialog } from './PunchItemDialog';
import { PunchItemCard } from './PunchItemCard';
import { AIPunchBuilderDialog } from './AIPunchBuilderDialog';
import { SendPunchTransmittalDialog } from './SendPunchTransmittalDialog';
import { PunchTransmittalsPanel } from './PunchTransmittalsPanel';

interface PunchListTabProps {
  projectId: string;
}

const statusOptions = [
  { value: 'all', label: 'All Items' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'verified', label: 'Verified' },
];

export function PunchListTab({ projectId }: PunchListTabProps) {
  const { data: punchItems, isLoading } = usePunchItemsByProject(projectId);
  const { data: stats } = usePunchItemStats(projectId);
  const { data: project } = useProject(projectId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [preselect, setPreselect] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const filteredItems = punchItems?.filter(item =>
    statusFilter === 'all' || item.status === statusFilter
  );
  
  // Group by location
  const groupedByLocation = filteredItems?.reduce((acc, item) => {
    const location = item.location || 'Unspecified';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(item);
    return acc;
  }, {} as Record<string, PunchItem[]>);
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats?.open || 0}</div>
            <p className="text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats?.inProgress || 0}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{stats?.completed || 0}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats?.verified || 0}</div>
            <p className="text-sm text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setPreselect([]); setSendOpen(true); }}>
            <Send className="h-4 w-4 mr-2" />
            Send to sub
          </Button>
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Punch Item
          </Button>
        </div>
      </div>
      
      {/* Punch Items List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByLocation || {}).map(([location, items]) => (
            <Card key={location}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{location}</CardTitle>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <PunchItemCard key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No punch items</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== 'all' ? 'No items match the selected filter' : 'Add your first punch item to track completion tasks'}
            </p>
            {statusFilter === 'all' && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Punch Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Sent-to-subs tracking + audit trail */}
      <PunchTransmittalsPanel projectId={projectId} />

      <PunchItemDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
      />
      <AIPunchBuilderDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        projectId={projectId}
        projectName={project?.name}
        onSaved={(ids, send) => { if (send) { setPreselect(ids); setSendOpen(true); } }}
      />
      <SendPunchTransmittalDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        projectId={projectId}
        projectName={project?.name}
        preselectedIds={preselect}
      />
    </div>
  );
}
