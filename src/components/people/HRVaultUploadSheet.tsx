import { useState, useRef, useEffect } from 'react';
import { Upload, File, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHRVault, type HRDocumentCategory } from '@/hooks/useHRVault';

interface HRVaultUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  categories: HRDocumentCategory[];
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function HRVaultUploadSheet({
  open,
  onOpenChange,
  employeeId,
  categories,
}: HRVaultUploadSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument } = useHRVault(employeeId);

  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState('');

  const selectedCategory = categories.find(c => c.id === categoryId);
  const requiresExpiry = selectedCategory?.requires_expiry ?? false;

  // Auto-populate title when category changes
  useEffect(() => {
    if (selectedCategory && !title) {
      setTitle(selectedCategory.name);
    }
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setFile(null);
    setCategoryId('');
    setTitle('');
    setExpiryDate('');
    setNotes('');
    setSizeError('');
  };

  const handleFileSelect = (selected: File) => {
    if (selected.size > MAX_SIZE_BYTES) {
      setSizeError(`File too large (max 25 MB). Selected: ${(selected.size / 1024 / 1024).toFixed(1)} MB`);
      return;
    }
    setSizeError('');
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !categoryId || !title) return;

    try {
      await uploadDocument.mutateAsync({
        file,
        categoryId,
        title,
        notes: notes || undefined,
        expiryDate: expiryDate || undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Upload to HR Vault</SheetTitle>
          <SheetDescription>
            Upload employment paperwork for this employee. Only admin and manager roles can access these documents.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {/* File Drop Zone */}
          <div>
            <Label>File *</Label>
            <div
              className={cn(
                'mt-2 border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer',
                isDragging && 'border-primary bg-primary/5',
                file && 'border-primary/40 bg-primary/5',
                !file && !isDragging && 'border-input hover:border-muted-foreground',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <File className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drag and drop or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOCX · max 25 MB</p>
                </>
              )}
            </div>
            {sizeError && (
              <p className="text-xs text-destructive mt-1">{sizeError}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="hr-category">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="hr-category">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="hr-title">Title *</Label>
            <Input
              id="hr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              required
            />
          </div>

          {/* Expiry Date — only if category requires it */}
          {requiresExpiry && (
            <div className="space-y-2">
              <Label htmlFor="hr-expiry">Expiry Date</Label>
              <Input
                id="hr-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for documents that expire (e.g., government IDs).
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="hr-notes">Notes</Label>
            <Textarea
              id="hr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional internal notes…"
              rows={2}
            />
          </div>

          <SheetFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !categoryId || !title || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading…' : 'Upload Document'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
