import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, MoreHorizontal, Mail } from 'lucide-react';
import { useRFIsByProject, useRFIStats, type RFI } from '@/hooks/useRFIs';
import { RFIDialog } from './RFIDialog';
import { RFIDetailSheet } from './RFIDetailSheet';
import { SendExternalEmailDialog } from './SendExternalEmailDialog';

interface RFIListProps {
  projectId: string;
  projectName?: string;
}

const statusConfig = {
  open: { label: 'Open', variant: 'outline' as const, icon: Clock },
  pending: { label: 'Pending', variant: 'secondary' as const, icon: MessageSquare },
  answered: { label: 'Answered', variant: 'default' as const, icon: CheckCircle },
  closed: { label: 'Closed', variant: 'secondary' as const, icon: XCircle },
};

export function RFIList({ projectId, projectName = '' }: RFIListProps) {
  const { data: rfis, isLoading } = useRFIsByProject(projectId);
  const { data: stats } = useRFIStats(projectId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [emailRFI, setEmailRFI] = useState<RFI | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const handleRFIClick = (rfi: RFI) => {
    setSelectedRFI(rfi);
    setDetailSheetOpen(true);
  };

  const handleEmailRFI = (e: React.MouseEvent, rfi: RFI) => {
    e.stopPropagation();
    setEmailRFI(rfi);
    setEmailDialogOpen(true);
  };

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
            <div className="text-2xl font-bold text-blue-500">{stats?.pending || 0}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats?.answered || 0}</div>
            <p className="text-sm text-muted-foreground">Answered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats?.closed || 0}</div>
            <p className="text-sm text-muted-foreground">Closed</p>
          </CardContent>
        </Card>
      </div>

      {/* RFI List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requests for Information</CardTitle>
              <CardDescription>{stats?.total || 0} total RFIs</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New RFI
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rfis && rfis.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">RFI #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfis.map((rfi) => {
                  const config = statusConfig[rfi.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow
                      key={rfi.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRFIClick(rfi)}
                    >
                      <TableCell className="font-mono font-medium">
                        #{rfi.rfi_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rfi.subject}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {rfi.question}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rfi.due_date
                          ? format(new Date(rfi.due_date), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rfi.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRFIClick(rfi)}>
                              Open RFI
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleEmailRFI(e, rfi)} className="gap-2">
                              <Mail className="h-4 w-4" />
                              Email Externally
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No RFIs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Request for Information
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New RFI
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RFIDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
      />

      <RFIDetailSheet
        rfi={selectedRFI}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        projectName={projectName}
      />

      {emailRFI && (
        <SendExternalEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          documentType="rfi"
          documentTitle={`RFI #${emailRFI.rfi_number} — ${emailRFI.subject}`}
          documentId={emailRFI.id}
          projectName={projectName}
          contentHtml={`
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;width:140px;">Status</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailRFI.status}</td></tr>
              ${emailRFI.due_date ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Due Date</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailRFI.due_date}</td></tr>` : ''}
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Question</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailRFI.question}</td></tr>
              ${emailRFI.response ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Response</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailRFI.response}</td></tr>` : ''}
            </table>
          `}
        />
      )}
    </div>
  );
}
