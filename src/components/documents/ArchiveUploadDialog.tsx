import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Upload, File, X, Archive, Loader2 } from 'lucide-react';
import { ARCHIVE_CATEGORIES, useUploadPropertyArchive } from '@/hooks/usePropertyArchives';
import { useProperties } from '@/hooks/useProperties';
import { cn } from '@/lib/utils';

interface ArchiveUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
}

export function ArchiveUploadDialog({
  open,
  onOpenChange,
  defaultCategory = 'as-builts',
}: ArchiveUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [revision, setRevision] = useState('A');
  const [propertyId, setPropertyId] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  const uploadMutation = useUploadPropertyArchive();
  const { data: properties } = useProperties();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      if (!name) {
        setName(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/dwg': ['.dwg'],
      'application/dxf': ['.dxf'],
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    await uploadMutation.mutateAsync({
      file,
      name,
      category,
      description: description || undefined,
      document_number: documentNumber || undefined,
      revision: revision || 'A',
      property_id: propertyId || undefined,
      original_date: originalDate || undefined,
      received_from: receivedFrom || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      notes: notes || undefined,
    });

    // Reset form
    setFile(null);
    setName('');
    setDescription('');
    setDocumentNumber('');
    setRevision('A');
    setPropertyId('');
    setOriginalDate('');
    setReceivedFrom('');
    setTags('');
    setNotes('');
    onOpenChange(false);
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Archive className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Add to Property Archives</DialogTitle>
              <DialogDescription>
                Upload a permanent record. This document cannot be deleted.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* File Upload */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, images, Word, Excel, PowerPoint, CAD files supported
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
              <File className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Document Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Site Plan As-Built"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARCHIVE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Number */}
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g., DWG-001"
              />
            </div>

            {/* Revision */}
            <div className="space-y-2">
              <Label htmlFor="revision">Revision</Label>
              <Select value={revision} onValueChange={setRevision}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '1', '2', '3', '4', '5'].map(
                    (rev) => (
                      <SelectItem key={rev} value={rev}>
                        REV {rev}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Property */}
            <div className="space-y-2">
              <Label htmlFor="property">Property (Optional)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific property</SelectItem>
                  {properties?.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Original Date */}
            <div className="space-y-2">
              <Label htmlFor="originalDate">Original Date</Label>
              <Input
                id="originalDate"
                type="date"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
              />
            </div>

            {/* Received From */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="receivedFrom">Received From</Label>
              <Input
                id="receivedFrom"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="e.g., ABC Engineering, City of Houston"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document..."
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., hvac, mechanical, building-a"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !name || uploadMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Document
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
