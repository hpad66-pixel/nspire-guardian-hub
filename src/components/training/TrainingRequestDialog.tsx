import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { useCreateTrainingRequest } from '@/hooks/useTrainingRequests';
import { MessageSquarePlus, Lightbulb, HelpCircle, BookMarked } from 'lucide-react';

interface TrainingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUEST_CATEGORIES = [
  { value: 'new_topic', label: 'New Topic', icon: Lightbulb, description: 'Request a new training topic' },
  { value: 'improvement', label: 'Improvement', icon: MessageSquarePlus, description: 'Suggest improvements to existing content' },
  { value: 'question', label: 'Question', icon: HelpCircle, description: 'Ask a question about training' },
  { value: 'resource_request', label: 'Resource Request', icon: BookMarked, description: 'Request specific resources or materials' },
];

export function TrainingRequestDialog({ open, onOpenChange }: TrainingRequestDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('new_topic');
  const [priority, setPriority] = useState<string>('normal');

  const { mutate: createRequest, isPending } = useCreateTrainingRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    createRequest(
      {
        title: title.trim(),
        description: description.trim(),
        category: category as any,
        priority: priority as any,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle('');
          setDescription('');
          setCategory('new_topic');
          setPriority('normal');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Training</DialogTitle>
          <DialogDescription>
            Let us know what training would help you do your job better. Your input shapes our curriculum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label>What type of request is this?</Label>
            <RadioGroup
              value={category}
              onValueChange={setCategory}
              className="grid grid-cols-2 gap-3"
            >
              {REQUEST_CATEGORIES.map((cat) => (
                <Label
                  key={cat.value}
                  htmlFor={cat.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    category === cat.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <RadioGroupItem value={cat.value} id={cat.value} className="sr-only" />
                  <cat.icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium block">{cat.label}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{cat.description}</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Need training on new HVAC systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <VoiceDictationTextareaWithAI
              id="description"
              placeholder="Tell us what you need and why it would help your work..."
              value={description}
              onValueChange={setDescription}
              context="notes"
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Nice to have</SelectItem>
                <SelectItem value="normal">Normal - Would be helpful</SelectItem>
                <SelectItem value="high">High - Needed soon</SelectItem>
                <SelectItem value="urgent">Urgent - Critical for my work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !description.trim()}>
              {isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
