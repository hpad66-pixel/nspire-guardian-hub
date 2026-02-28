import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Plus, Trash2, Check, GripVertical, FileSpreadsheet } from 'lucide-react';
import { useSOVLineItems, useUpsertSOVLineItem, useDeleteSOVLineItem } from '@/hooks/useSOV';
import { toast } from 'sonner';

interface SOVEditorProps {
  projectId: string;
  workspaceId: string;
  readOnly?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export function SOVEditor({ projectId, workspaceId, readOnly = false }: SOVEditorProps) {
  const { data: items = [], isLoading } = useSOVLineItems(projectId);
  const upsert = useUpsertSOVLineItem();
  const deleteLine = useDeleteSOVLineItem();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<{ item_number: string; description: string; scheduled_value: string; retainage_pct: string } | null>(null);

  const totalValue = items.reduce((s, i) => s + Number(i.scheduled_value), 0);
  const avgRetainage = items.length > 0
    ? items.reduce((s, i) => s + Number(i.retainage_pct) * Number(i.scheduled_value), 0) / (totalValue || 1)
    : 10;

  const handleSave = useCallback(async (item: typeof items[0]) => {
    await upsert.mutateAsync({
      id: item.id,
      project_id: projectId,
      workspace_id: workspaceId,
      item_number: item.item_number,
      description: item.description,
      scheduled_value: Number(item.scheduled_value),
      retainage_pct: Number(item.retainage_pct),
      sort_order: item.sort_order,
    });
    setSavedId(item.id);
    setTimeout(() => setSavedId(null), 2000);
  }, [upsert, projectId, workspaceId]);

  const handleAddNew = async () => {
    if (!newRow || !newRow.description) return;
    await upsert.mutateAsync({
      project_id: projectId,
      workspace_id: workspaceId,
      item_number: newRow.item_number || String(items.length + 1).padStart(2, '0'),
      description: newRow.description,
      scheduled_value: Number(newRow.scheduled_value) || 0,
      retainage_pct: Number(newRow.retainage_pct) || 10,
      sort_order: items.length,
    });
    setNewRow(null);
    toast.success('Line item added');
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading schedule of values...</div>;

  if (items.length === 0 && !newRow) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">No SOV defined yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add line items to define the contract breakdown before creating pay applications.
            </p>
          </div>
          {!readOnly && (
            <Button onClick={() => setNewRow({ item_number: '01', description: '', scheduled_value: '', retainage_pct: '10' })}>
              <Plus className="h-4 w-4 mr-2" />Add First Line Item
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Schedule of Values</CardTitle>
          <CardDescription>Total Contract Value: {formatCurrency(totalValue)}</CardDescription>
        </div>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => setNewRow({ item_number: String(items.length + 1).padStart(2, '0'), description: '', scheduled_value: '', retainage_pct: '10' })}
          >
            <Plus className="h-4 w-4 mr-1" />Add Line Item
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(var(--sidebar-bg))] hover:bg-[hsl(var(--sidebar-bg))]">
                <TableHead className="w-[50px] text-white">#</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="w-[160px] text-right text-white">Scheduled Value</TableHead>
                <TableHead className="w-[100px] text-center text-white">Ret. %</TableHead>
                {!readOnly && <TableHead className="w-[80px] text-white">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <EditableSOVRow
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  saved={savedId === item.id}
                  onSave={handleSave}
                  onDelete={() => deleteLine.mutate({ id: item.id, projectId })}
                  even={idx % 2 === 1}
                />
              ))}
              {newRow && (
                <TableRow>
                  <TableCell>
                    <Input value={newRow.item_number} onChange={e => setNewRow({ ...newRow, item_number: e.target.value })} className="h-8 w-12 font-mono text-sm" />
                  </TableCell>
                  <TableCell>
                    <Input value={newRow.description} onChange={e => setNewRow({ ...newRow, description: e.target.value })} placeholder="Description" className="h-8 text-sm" autoFocus />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" value={newRow.scheduled_value} onChange={e => setNewRow({ ...newRow, scheduled_value: e.target.value })} className="h-8 text-right font-mono text-sm" placeholder="0" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input type="number" value={newRow.retainage_pct} onChange={e => setNewRow({ ...newRow, retainage_pct: e.target.value })} className="h-8 w-16 text-center font-mono text-sm mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-500" onClick={handleAddNew}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setNewRow(null)}>✕</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={2}>TOTAL CONTRACT VALUE</TableCell>
                <TableCell className="text-right font-mono text-base">{formatCurrency(totalValue)}</TableCell>
                <TableCell className="text-center font-mono text-sm">{avgRetainage.toFixed(1)}%</TableCell>
                {!readOnly && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableSOVRow({ item, readOnly, saved, onSave, onDelete, even }: {
  item: any;
  readOnly: boolean;
  saved: boolean;
  onSave: (item: any) => void;
  onDelete: () => void;
  even: boolean;
}) {
  const [local, setLocal] = useState({
    item_number: item.item_number,
    description: item.description,
    scheduled_value: String(item.scheduled_value),
    retainage_pct: String(item.retainage_pct),
  });

  const handleBlur = () => {
    const changed =
      local.item_number !== item.item_number ||
      local.description !== item.description ||
      Number(local.scheduled_value) !== Number(item.scheduled_value) ||
      Number(local.retainage_pct) !== Number(item.retainage_pct);
    if (changed && !readOnly) {
      onSave({ ...item, ...local, scheduled_value: Number(local.scheduled_value), retainage_pct: Number(local.retainage_pct) });
    }
  };

  if (readOnly) {
    return (
      <TableRow className={even ? 'bg-muted/30' : ''}>
        <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
        <TableCell className="text-sm">{item.description}</TableCell>
        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(item.scheduled_value))}</TableCell>
        <TableCell className="text-center font-mono text-sm">{Number(item.retainage_pct)}%</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={even ? 'bg-muted/30' : ''}>
      <TableCell>
        <div className="flex items-center gap-1">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
          <Input value={local.item_number} onChange={e => setLocal({ ...local, item_number: e.target.value })} onBlur={handleBlur} className="h-7 w-12 font-mono text-sm border-transparent hover:border-primary/30 focus:border-primary" />
        </div>
      </TableCell>
      <TableCell>
        <Input value={local.description} onChange={e => setLocal({ ...local, description: e.target.value })} onBlur={handleBlur} className="h-7 text-sm border-transparent hover:border-primary/30 focus:border-primary" />
      </TableCell>
      <TableCell>
        <Input type="number" value={local.scheduled_value} onChange={e => setLocal({ ...local, scheduled_value: e.target.value })} onBlur={handleBlur} className="h-7 text-right font-mono text-sm border-transparent hover:border-primary/30 focus:border-primary" />
      </TableCell>
      <TableCell>
        <Input type="number" value={local.retainage_pct} onChange={e => setLocal({ ...local, retainage_pct: e.target.value })} onBlur={handleBlur} className="h-7 w-16 text-center font-mono text-sm mx-auto border-transparent hover:border-primary/30 focus:border-primary" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {saved && <Check className="h-3.5 w-3.5 text-green-500" />}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
