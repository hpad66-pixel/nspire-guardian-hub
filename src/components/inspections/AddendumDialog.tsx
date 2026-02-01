import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextarea } from '@/components/ui/voice-dictation-textarea';
import { useCreateAddendum } from '@/hooks/useInspectionAddendums';
import { Upload, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddendumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
}

export function AddendumDialog({ open, onOpenChange, inspectionId }: AddendumDialogProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const createAddendum = useCreateAddendum();

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${inspectionId}-addendum-${Date.now()}.${fileExt}`;
        const filePath = `daily-inspections/addendums/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setAttachments(prev => [...prev, ...newUrls]);
      toast.success('Attachment uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter addendum content');
      return;
    }

    try {
      await createAddendum.mutateAsync({
        daily_inspection_id: inspectionId,
        content: content.trim(),
        attachments,
      });
      
      setContent('');
      setAttachments([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Addendum</DialogTitle>
          <DialogDescription>
            Add a correction, clarification, or additional information to this completed inspection. 
            Addendums cannot be edited once submitted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Addendum Content</Label>
            <VoiceDictationTextarea
              value={content}
              onValueChange={setContent}
              placeholder="Enter your addendum... You can also use the microphone to dictate."
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((url, index) => (
                <div key={index} className="relative group">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
                  >
                    <Paperclip className="h-3 w-3" />
                    Attachment {index + 1}
                  </a>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <span className="flex items-center gap-1 px-2 py-1 border border-dashed rounded text-sm hover:bg-muted transition-colors">
                  <Upload className="h-3 w-3" />
                  {isUploading ? 'Uploading...' : 'Add File'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createAddendum.isPending || !content.trim()}
          >
            {createAddendum.isPending ? 'Submitting...' : 'Submit Addendum'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
