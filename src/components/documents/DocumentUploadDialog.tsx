import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, File, X } from 'lucide-react';
import { useUploadOrganizationDocument, DOCUMENT_FOLDERS } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolder?: string;
}

export function DocumentUploadDialog({ open, onOpenChange, defaultFolder = 'General' }: DocumentUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState(defaultFolder);
  const [expiryDate, setExpiryDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const uploadDocument = useUploadOrganizationDocument();
  
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) return;
    
    try {
      await uploadDocument.mutateAsync({
        file,
        folder,
        name,
        description: description || undefined,
        expiryDate: expiryDate || undefined,
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setFolder(defaultFolder);
    setExpiryDate('');
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document to the organization library.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              isDragging && "border-primary bg-primary/5",
              file && "border-success bg-success/5"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
            
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <File className="h-5 w-5 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drag and drop a file here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </>
            )}
          </div>
          
          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              required
            />
          </div>
          
          {/* Folder */}
          <div className="space-y-2">
            <Label>Folder *</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_FOLDERS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>
          
          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              For contracts, insurance, permits that expire
            </p>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !name || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
