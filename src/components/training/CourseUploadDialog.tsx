import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileArchive, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCreateCourse, 
  useUpdateCourse,
  useProcessCourseZip, 
  COURSE_CATEGORIES,
  type TrainingCourse,
} from '@/hooks/useTrainingCourses';
import { toast } from 'sonner';

interface CourseUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourse?: TrainingCourse | null;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

type AppRole = 'admin' | 'inspector' | 'manager' | 'owner' | 'project_manager' | 'subcontractor' | 'superintendent' | 'user' | 'viewer';

const AVAILABLE_ROLES: { id: AppRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'manager', label: 'Manager' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'superintendent', label: 'Superintendent' },
  { id: 'subcontractor', label: 'Subcontractor' },
  { id: 'user', label: 'User' },
];

export function CourseUploadDialog({
  open,
  onOpenChange,
  editingCourse,
}: CourseUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(editingCourse?.title || '');
  const [description, setDescription] = useState(editingCourse?.description || '');
  const [category, setCategory] = useState(editingCourse?.category || 'operations');
  const [durationMinutes, setDurationMinutes] = useState(
    editingCourse?.duration_minutes?.toString() || ''
  );
  const [isActive, setIsActive] = useState(editingCourse?.is_active ?? false);
  const [isRequired, setIsRequired] = useState(editingCourse?.is_required ?? false);
  const [targetRoles, setTargetRoles] = useState<AppRole[]>((editingCourse?.target_roles || []) as AppRole[]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showReupload, setShowReupload] = useState(false);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const processZip = useProcessCourseZip();

  const isEditing = !!editingCourse;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const zipFile = acceptedFiles[0];
    if (zipFile && zipFile.name.toLowerCase().endsWith('.zip')) {
      setFile(zipFile);
      setErrorMessage('');
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = zipFile.name.replace(/\.zip$/i, '');
        setTitle(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    } else {
      setErrorMessage('Please upload a valid ZIP file');
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 1,
    disabled: uploadStatus !== 'idle',
  });

  const handleRoleToggle = (roleId: AppRole) => {
    setTargetRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a course title');
      return;
    }

    if (!isEditing && !file) {
      setErrorMessage('Please upload a course ZIP file');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(10);

      if (isEditing) {
        // Update metadata first
        await updateCourse.mutateAsync({
          id: editingCourse.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          is_active: isActive,
          is_required: isRequired,
          target_roles: targetRoles,
        });

        // If a new file was provided, reprocess the course content
        if (file) {
          setUploadProgress(40);
          setUploadStatus('processing');

          await processZip.mutateAsync({
            file: file,
            courseId: editingCourse.id,
          });

          setUploadProgress(90);
          toast.success('Course content replaced successfully!');
        }
        
        setUploadProgress(100);
        setUploadStatus('success');
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 1500);
      } else {
        // Create new course and upload ZIP
        setUploadProgress(20);

        // First create the course record
        const course = await createCourse.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          content_path: '', // Will be set by edge function
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          is_active: false, // Will activate after processing
          is_required: isRequired,
          target_roles: targetRoles,
        });

        setUploadProgress(40);
        setUploadStatus('processing');

        // Process the ZIP file
        await processZip.mutateAsync({
          file: file!,
          courseId: course.id,
        });

        setUploadProgress(90);

        // Activate the course if requested
        if (isActive) {
          await updateCourse.mutateAsync({
            id: course.id,
            is_active: true,
          });
        }

        setUploadProgress(100);
        setUploadStatus('success');

        toast.success('Course uploaded successfully!');

        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 1500);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('operations');
    setDurationMinutes('');
    setIsActive(false);
    setIsRequired(false);
    setTargetRoles([]);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setShowReupload(false);
  };

  const handleClose = () => {
    if (uploadStatus !== 'uploading' && uploadStatus !== 'processing') {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Course' : 'Upload Articulate Course'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update course details and settings'
              : 'Upload an Articulate HTML5 export (.zip) to create a new course'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Zone (for new courses OR re-uploading existing) */}
          {(!isEditing || showReupload) && (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                uploadStatus !== 'idle' && 'pointer-events-none opacity-60'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileArchive className="h-10 w-10 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
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
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">
                    {isDragActive
                      ? 'Drop your ZIP file here'
                      : showReupload 
                        ? 'Drop a new ZIP file to replace course content'
                        : 'Drag & drop your Articulate HTML5 export'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </>
              )}
            </div>
          )}

          {/* Reupload Option for Existing Courses */}
          {isEditing && !showReupload && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">Course Content</p>
                <p className="text-sm text-muted-foreground">
                  Current entry file: {editingCourse?.entry_file || 'Unknown'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReupload(true)}
                disabled={uploadStatus !== 'idle'}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Content
              </Button>
            </div>
          )}

          {/* Upload Progress */}
          {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing course...'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Course {isEditing ? 'updated' : 'uploaded'} successfully!
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && uploadStatus !== 'success' && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Course Details Form */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Safety Training 101"
                disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the course content"
                rows={3}
                disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                  disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                />
              </div>
            </div>

            {/* Target Roles */}
            <div className="grid gap-2">
              <Label>Target Roles (leave empty for all)</Label>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_ROLES.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={targetRoles.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                      disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                />
                <Label htmlFor="required" className="cursor-pointer">
                  Required Course
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Published
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              uploadStatus === 'uploading' ||
              uploadStatus === 'processing' ||
              uploadStatus === 'success' ||
              (!isEditing && !file) ||
              !title.trim()
            }
          >
            {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Upload Course'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
