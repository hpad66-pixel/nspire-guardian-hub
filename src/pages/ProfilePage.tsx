import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile, useUpdateMyProfile, useUploadAvatar } from '@/hooks/useMyProfile';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, User, Lock, Loader2, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { MyCredentialsList } from '@/components/credentials/MyCredentialsList';
import { useModules } from '@/contexts/ModuleContext';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  manager: 'Property Manager',
  inspector: 'Inspector',
  administrator: 'Office Administrator',
  superintendent: 'Superintendent',
  clerk: 'Clerk',
  project_manager: 'Project Manager',
  subcontractor: 'Subcontractor',
  viewer: 'Viewer',
  user: 'User',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  owner: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  administrator: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  project_manager: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  superintendent: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  inspector: 'bg-green-500/10 text-green-500 border-green-500/20',
  clerk: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  subcontractor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  viewer: 'bg-muted text-muted-foreground border-muted',
  user: 'bg-muted text-muted-foreground border-muted',
};

export default function ProfilePage() {
  const { isModuleEnabled } = useModules();
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const { data: currentRole } = useCurrentUserRole();
  const updateProfile = useUpdateMyProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    job_title: '',
    department: '',
    hire_date: '',
    emergency_contact: '',
    emergency_phone: '',
    work_email: '',
  });
  const [formInitialized, setFormInitialized] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Initialize form once profile loads
  if (profile && !formInitialized) {
    setForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      job_title: profile.job_title || '',
      department: profile.department || '',
      hire_date: profile.hire_date || '',
      emergency_contact: profile.emergency_contact || '',
      emergency_phone: profile.emergency_phone || '',
      work_email: profile.work_email || '',
    });
    setFormInitialized(true);
  }

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar.mutateAsync(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync(form);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInitials = () => {
    const name =
      form.full_name || (user?.user_metadata?.full_name as string) || user?.email || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'U';
  };

  const passwordsMatch =
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  const passwordsDontMatch =
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and account security
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className={cn(
            'mb-6 grid w-full',
            isModuleEnabled('credentialWalletEnabled')
              ? 'grid-cols-3 sm:w-auto sm:inline-flex'
              : 'grid-cols-2 sm:w-auto sm:inline-flex'
          )}>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            {isModuleEnabled('credentialWalletEnabled') && (
              <TabsTrigger value="credentials" className="gap-2">
                <BadgeCheck className="h-4 w-4" />
                Credentials
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          <TabsContent value="profile" className="space-y-6">

            {/* Identity card — photo + name + role */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center gap-5">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

                    {/* Avatar with upload overlay */}
                    <div className="relative flex-shrink-0 self-start">
                      <button
                        onClick={handleAvatarClick}
                        className="group relative flex h-20 w-20 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-label="Upload profile photo"
                      >
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profile photo" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100">
                          {uploadAvatar.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          ) : (
                            <Camera className="h-5 w-5 text-white" />
                          )}
                        </div>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </div>

                    {/* Name, role, email */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <h2 className="text-xl font-semibold text-foreground truncate">
                        {form.full_name || user?.email || 'Your Name'}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {currentRole && (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', roleColors[currentRole as AppRole])}
                          >
                            {roleLabels[currentRole as AppRole] || currentRole}
                          </Badge>
                        )}
                        {profile?.status && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {profile.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Click your photo to upload a new one · JPG, PNG, WebP · max 5 MB
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Your name and contact details visible to your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Mobile Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={form.job_title}
                      onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                      placeholder="Property Inspector"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      placeholder="Operations"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="work_email">Work Email</Label>
                    <Input
                      id="work_email"
                      value={form.work_email}
                      onChange={(e) => setForm((f) => ({ ...f, work_email: e.target.value }))}
                      placeholder="jane@company.com"
                      type="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hire_date">Start Date</Label>
                    <Input
                      id="hire_date"
                      value={form.hire_date}
                      onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                      type="date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Emergency Contact</CardTitle>
                <CardDescription>
                  Only visible to administrators and property managers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_contact">Contact Name</Label>
                    <Input
                      id="emergency_contact"
                      value={form.emergency_contact}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, emergency_contact: e.target.value }))
                      }
                      placeholder="John Smith (Spouse)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_phone">Contact Phone</Label>
                    <Input
                      id="emergency_phone"
                      value={form.emergency_phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, emergency_phone: e.target.value }))
                      }
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Info (read-only) */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Managed by your administrator</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-8">
                    <span className="w-28 shrink-0 text-muted-foreground">Login Email</span>
                    <span className="font-medium text-foreground">{user?.email}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-8">
                    <span className="w-28 shrink-0 text-muted-foreground">User ID</span>
                    <span className="font-mono text-xs text-muted-foreground break-all">
                      {user?.id}
                    </span>
                  </div>
                  {profile?.updated_at && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-8">
                      <span className="w-28 shrink-0 text-muted-foreground">Last Updated</span>
                      <span className="font-medium text-foreground">
                        {new Date(profile.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="min-w-32"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── SECURITY TAB ────────────────────────────────────────────── */}
          <TabsContent value="security" className="space-y-6">

            {/* Change Password */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Change Password</CardTitle>
                </div>
                <CardDescription>
                  Choose a strong password at least 8 characters long
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                  />
                </div>

                {/* Passwords match indicator */}
                {(passwordsMatch || passwordsDontMatch) && (
                  <p
                    className={cn(
                      'text-xs font-medium',
                      passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                    )}
                  >
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !passwordsMatch}
                  className="mt-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Active Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Signed in as{' '}
                  <span className="font-medium text-foreground">{user?.email}</span>
                </p>
                <p className="text-muted-foreground">
                  Last sign in:{' '}
                  <span className="font-medium text-foreground">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Unknown'}
                  </span>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CREDENTIALS TAB ─────────────────────────────────────────── */}
          {isModuleEnabled('credentialWalletEnabled') && (
            <TabsContent value="credentials">
              <MyCredentialsList />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
