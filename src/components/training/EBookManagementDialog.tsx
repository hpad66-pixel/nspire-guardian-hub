import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Pencil, Trash2, Link, Image, Code, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateTrainingResource,
  useUpdateTrainingResource,
  useDeleteTrainingResource,
  type TrainingResource,
} from '@/hooks/useTrainingResources';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIES = [
  { value: 'onboarding', label: 'New Hire Onboarding' },
  { value: 'maintenance', label: 'Maintenance Essentials' },
  { value: 'safety', label: 'Safety Protocols' },
  { value: 'compliance', label: 'NSPIRE Compliance' },
  { value: 'operations', label: 'Property Operations' },
  { value: 'emergency', label: 'Emergency Response' },
];

const TARGET_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Property Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'user', label: 'Staff' },
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  embed_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  embed_code: z.string().optional(),
  thumbnail_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  duration_minutes: z.coerce.number().optional(),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  target_roles: z.array(z.string()).default([]),
  sort_order: z.coerce.number().optional(),
}).refine(
  (data) => data.embed_url || data.embed_code,
  { message: 'Either Embed URL or Embed Code is required', path: ['embed_code'] }
);

type FormValues = z.infer<typeof formSchema>;

interface EBookManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEbook?: TrainingResource | null;
}

export function EBookManagementDialog({
  open,
  onOpenChange,
  editingEbook,
}: EBookManagementDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const createResource = useCreateTrainingResource();
  const updateResource = useUpdateTrainingResource();
  const deleteResource = useDeleteTrainingResource();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      embed_url: '',
      embed_code: '',
      thumbnail_url: '',
      category: 'operations',
      duration_minutes: undefined,
      is_required: false,
      is_active: true,
      target_roles: [],
      sort_order: undefined,
    },
  });

  useEffect(() => {
    if (editingEbook) {
      // Detect if embed_code contains HTML (iframe) or is a URL
      const storedValue = editingEbook.embed_code || '';
      const isHtmlEmbed = storedValue.includes('<iframe') || storedValue.includes('<embed');
      
      form.reset({
        title: editingEbook.title,
        description: editingEbook.description || '',
        embed_url: isHtmlEmbed ? '' : storedValue,
        embed_code: isHtmlEmbed ? storedValue : '',
        thumbnail_url: editingEbook.thumbnail_url || '',
        category: editingEbook.category,
        duration_minutes: editingEbook.duration_minutes || undefined,
        is_required: editingEbook.is_required || false,
        is_active: editingEbook.is_active !== false,
        target_roles: editingEbook.target_roles || [],
        sort_order: editingEbook.sort_order || undefined,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        embed_url: '',
        embed_code: '',
        thumbnail_url: '',
        category: 'operations',
        duration_minutes: undefined,
        is_required: false,
        is_active: true,
        target_roles: [],
        sort_order: undefined,
      });
    }
  }, [editingEbook, form]);

  const onSubmit = async (data: FormValues) => {
    // Use embed_code (HTML) if provided, otherwise use embed_url
    const finalEmbedCode = data.embed_code?.trim() || data.embed_url?.trim() || '';
    
    const payload = {
      title: data.title,
      description: data.description || null,
      embed_code: finalEmbedCode,
      thumbnail_url: data.thumbnail_url || null,
      category: data.category,
      duration_minutes: data.duration_minutes || null,
      is_required: data.is_required,
      is_active: data.is_active,
      target_roles: data.target_roles.length > 0 ? data.target_roles as AppRole[] : null,
      sort_order: data.sort_order || null,
      resource_type: 'ebook' as const,
    };

    if (editingEbook) {
      await updateResource.mutateAsync({ id: editingEbook.id, ...payload });
    } else {
      await createResource.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (editingEbook) {
      await deleteResource.mutateAsync(editingEbook.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  const isSubmitting = createResource.isPending || updateResource.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEbook ? (
                <>
                  <Pencil className="h-5 w-5" />
                  Edit eBook
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add New eBook
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingEbook
                ? 'Update the eBook details and embed code.'
                : 'Add a new eBook to your training library. Paste the embed URL from your flipbook provider.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Employee Handbook 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the eBook content..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="embed_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Embed URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://online.fliphtml5.com/xxxxx/xxxx/"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste the embed URL from FlipHTML5, Issuu, or similar flipbook services.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="embed_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Embed Code (HTML)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='<iframe src="..." width="100%" height="600" ...></iframe>'
                        className="font-mono text-sm resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Or paste the full HTML embed code (iframe). This takes priority over the URL above.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Cover Image URL (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/cover.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Read Time (mins)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="15"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Target Roles */}
              <FormField
                control={form.control}
                name="target_roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Target Audience (Optional)
                    </FormLabel>
                    <FormDescription>
                      Leave empty to show to all users, or select specific roles.
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {TARGET_ROLES.map((role) => {
                        const isSelected = field.value?.includes(role.value);
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(field.value?.filter((r: string) => r !== role.value) || []);
                              } else {
                                field.onChange([...(field.value || []), role.value]);
                              }
                            }}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {role.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sort Order */}
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1, 2, 3..."
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first. Leave empty for default ordering.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-6 pt-2">
                <FormField
                  control={form.control}
                  name="is_required"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Required reading</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Published</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2 pt-4">
                {editingEbook && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingEbook ? 'Save Changes' : 'Add eBook'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete eBook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{editingEbook?.title}" from your training library.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
