import { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';
import { useBulkCreateTenants } from '@/hooks/useTenants';
import {
  downloadTenantCsvTemplate,
  parseTenantCsvText,
  validateTenantCsvRows,
  type TenantCsvValidationResult,
} from '@/lib/occupancy/tenantCsv';
import { PMS_SOURCE_COMPACT } from '@/lib/occupancy/pmsSourceOfTruth';
import { cn } from '@/lib/utils';

interface TenantImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantImportDialog({ open, onOpenChange }: TenantImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<TenantCsvValidationResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: units = [] } = useUnits();
  const bulkCreate = useBulkCreateTenants();

  const validRows = validationResults.filter((r) => r.isValid);
  const invalidRows = validationResults.filter((r) => !r.isValid);

  const unitRefs = useMemo(
    () =>
      units.map((u) => ({
        id: u.id,
        unit_number: u.unit_number,
        property_id: u.property_id,
        property_name: u.property?.name ?? null,
      })),
    [units],
  );

  const isSupportedFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
  };

  const processFile = useCallback(
    async (selected: File) => {
      setIsProcessing(true);
      try {
        let csvText = '';
        const ext = selected.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'csv') {
          csvText = await selected.text();
        } else {
          const buffer = await selected.arrayBuffer();
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet], { blankrows: false });
        }
        const rows = parseTenantCsvText(csvText);
        setValidationResults(validateTenantCsvRows(rows, unitRefs));
      } catch (error) {
        console.error('Error parsing tenant CSV:', error);
        setValidationResults([]);
      } finally {
        setIsProcessing(false);
      }
    },
    [unitRefs],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isSupportedFile(selectedFile)) {
      setFile(selectedFile);
      void processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isSupportedFile(droppedFile)) {
      setFile(droppedFile);
      void processFile(droppedFile);
    }
  };

  const handleClose = (nextOpen = false) => {
    setFile(null);
    setValidationResults([]);
    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    const tenants = validRows.map((r) => r.data!).map((row) => ({
      ...row,
      created_by: null as string | null,
    }));
    try {
      await bulkCreate.mutateAsync(tenants);
      handleClose(false);
    } catch {
      /* toast in hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose(false))}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import occupancy from your PMO
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-[var(--apas-sapphire)]/20 bg-[var(--apas-sapphire)]/[0.04] px-3 py-2.5 flex gap-2 text-xs text-muted-foreground leading-relaxed">
          <Database className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--apas-sapphire)]" />
          <span>{PMS_SOURCE_COMPACT}</span>
        </div>

        <div className="flex-1 overflow-hidden space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              Export a CSV from your Property Management system, or use our template.
            </div>
            <Button variant="outline" size="sm" onClick={downloadTenantCsvTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          {!file && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
              )}
              onClick={() => document.getElementById('tenant-csv-file-input')?.click()}
            >
              <input
                id="tenant-csv-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop your PMO export here</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel · one-way into ProjOS only</p>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Processing file…</span>
            </div>
          )}

          {file && !isProcessing && validationResults.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Ready to import
                  </h4>
                  <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
                  <p className="text-sm text-muted-foreground">tenants</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Errors
                    </h4>
                    <p className="text-2xl font-bold text-destructive">{invalidRows.length}</p>
                    <p className="text-sm text-muted-foreground">rows will be skipped</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-[280px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Lease start</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.map((result, index) => (
                        <TableRow key={index} className={cn(!result.isValid && 'bg-destructive/5')}>
                          <TableCell>
                            {result.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {[result.rawData.first_name, result.rawData.last_name].filter(Boolean).join(' ') || '—'}
                          </TableCell>
                          <TableCell>{result.rawData.unit_number || '—'}</TableCell>
                          <TableCell>{result.rawData.property_name || '—'}</TableCell>
                          <TableCell>{result.rawData.lease_start || '—'}</TableCell>
                          <TableCell>
                            {result.isValid ? (
                              <Badge variant="outline">{result.data?.status}</Badge>
                            ) : (
                              <div className="flex items-center gap-1 text-destructive text-xs">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {result.error}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setValidationResults([]);
                  }}
                >
                  Choose different file
                </Button>
              </div>
            </>
          )}

          {file && !isProcessing && validationResults.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
              <p className="font-medium">No valid data found</p>
              <p className="text-sm">Check your CSV columns against the template and try again.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleImport()} disabled={validRows.length === 0 || bulkCreate.isPending}>
            {bulkCreate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} tenant{validRows.length === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
