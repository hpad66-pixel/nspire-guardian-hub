import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useInvitationByToken } from '@/hooks/useInvitations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const acceptSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type AcceptFormData = z.infer<typeof acceptSchema>;

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const { data: invitation, isLoading, error } = useInvitationByToken(token);

  const form = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Check if invitation is valid
  const isExpired = invitation ? new Date(invitation.expires_at) < new Date() : false;
  const isAlreadyAccepted = !!invitation?.accepted_at;
  const isValid = invitation && !isExpired && !isAlreadyAccepted;

  const onSubmit = async (data: AcceptFormData) => {
    if (!invitation || !token) return;

    setIsSubmitting(true);
    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Failed to mark invitation as accepted:', updateError);
      }

      setIsAccepted(true);
      toast.success('Account created successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
        navigate('/auth');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Glorieta Gardens Apartments</CardTitle>
            <CardDescription>
              {isAccepted 
                ? 'Welcome aboard!'
                : isValid 
                  ? 'Complete your account setup'
                  : 'Invitation Issue'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isAccepted ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </div>
              <div>
                <p className="font-medium">Account Created!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          ) : !invitation ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div>
                <p className="font-medium">Invalid Invitation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This invitation link is not valid. Please contact your administrator.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Go to Login
              </Button>
            </div>
          ) : isExpired ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-warning" />
                </div>
              </div>
              <div>
                <p className="font-medium">Invitation Expired</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This invitation has expired. Please ask your administrator to send a new one.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Go to Login
              </Button>
            </div>
          ) : isAlreadyAccepted ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-medium">Already Accepted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This invitation has already been used. Please log in with your credentials.
                </p>
              </div>
              <Button onClick={() => navigate('/auth')}>
                Go to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium">{invitation.email}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Role: </span>
                  <span className="font-medium capitalize">{invitation.role}</span>
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="John Doe"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
