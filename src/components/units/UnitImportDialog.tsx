import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useUnits, useBulkCreateUnits } from '@/hooks/useUnits';
import { parseCSV, validateRows, downloadCSVTemplate, type ValidationResult } from '@/lib/csvParser';
import { cn } from '@/lib/utils';


interface UnitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitImportDialog({ open, onOpenChange }: UnitImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: properties = [] } = useProperties();
  const { data: existingUnits = [] } = useUnits();
  const bulkCreate = useBulkCreateUnits();

  const validRows = validationResults.filter(r => r.isValid);
  const invalidRows = validationResults.filter(r => !r.isValid);

  const getFileExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';
  const isSupportedFile = (f: File) => {
    const ext = getFileExtension(f.name);
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      let csvText = '';
      const ext = getFileExtension(file.name);

      if (ext === 'csv') {
        csvText = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        csvText = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      }

      const { rows } = parseCSV(csvText);
      
      const existingUnitsList = existingUnits.map(u => ({
        unit_number: u.unit_number,
        property_id: u.property_id,
      }));

      const results = validateRows(rows, properties, existingUnitsList);
      setValidationResults(results);
    } catch (error) {
      console.error('Error parsing CSV:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [properties, existingUnits]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isSupportedFile(selectedFile)) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isSupportedFile(droppedFile)) {
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleImport = async () => {
    const unitsToImport = validRows.map(r => r.data!);
    try {
      await bulkCreate.mutateAsync(unitsToImport);
      handleClose();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResults([]);
    onOpenChange(false);
  };

  // Group valid units by property for summary
  const propertySummary = validRows.reduce((acc, row) => {
    const propertyName = row.rawData.property_name;
    acc[propertyName] = (acc[propertyName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Units from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Need a template? Download our CSV template to get started.
            </div>
            <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Drop Zone */}
          {!file && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">Drag and drop your CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.csv, .xlsx, .xls)</p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Processing CSV file...</span>
            </div>
          )}

          {/* Validation Results */}
          {file && !isProcessing && validationResults.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Ready to Import
                  </h4>
                  <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
                  <p className="text-sm text-muted-foreground">units</p>
                  
                  {Object.keys(propertySummary).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">By Property:</p>
                      <div className="space-y-1">
                        {Object.entries(propertySummary).map(([name, count]) => (
                          <div key={name} className="flex justify-between text-sm">
                            <span className="truncate">{name}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {invalidRows.length > 0 && (
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Errors Found
                    </h4>
                    <p className="text-2xl font-bold text-destructive">{invalidRows.length}</p>
                    <p className="text-sm text-muted-foreground">rows will be skipped</p>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        <TableHead>Unit #</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Beds</TableHead>
                        <TableHead>Baths</TableHead>
                        <TableHead>Sq Ft</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Occupancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.map((result, index) => (
                        <TableRow 
                          key={index}
                          className={cn(
                            !result.isValid && "bg-destructive/5"
                          )}
                        >
                          <TableCell>
                            {result.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {result.rawData.unit_number || '-'}
                          </TableCell>
                          <TableCell>{result.rawData.property_name || '-'}</TableCell>
                          <TableCell>{result.rawData.bedrooms || '1'}</TableCell>
                          <TableCell>{result.rawData.bathrooms || '1'}</TableCell>
                          <TableCell>{result.rawData.square_feet || '-'}</TableCell>
                          <TableCell>{result.rawData.floor || '-'}</TableCell>
                          <TableCell>
                            {result.isValid ? (
                              <Badge variant="outline">
                                {result.data?.status || 'occupied'}
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1 text-destructive text-xs">
                                <AlertTriangle className="h-3 w-3" />
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

              {/* File Info */}
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

          {/* Empty State after file selected but no valid data */}
          {file && !isProcessing && validationResults.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
              <p className="font-medium">No valid data found</p>
              <p className="text-sm">Please check your CSV file format and try again.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} Units
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
