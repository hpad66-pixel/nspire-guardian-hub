import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Award, Link2Off, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CertificateSharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['cert-share', token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) return null;
      const { data: link, error } = await supabase
        .from('training_share_links')
        .select(`*, completion:training_completions(*, profile:profiles!training_completions_user_id_fkey(full_name, avatar_url, job_title))`)
        .eq('token', token)
        .single();

      if (error || !link) return null;
      if (link.revoked) return null;
      if (new Date(link.expires_at) < new Date()) return null;
      return link;
    },
  });

  // Increment access count
  const incrementAccess = useMutation({
    mutationFn: async () => {
      if (!token || !data) return;
      await supabase
        .from('training_share_links')
        .update({
          access_count: (data.access_count ?? 0) + 1,
          accessed_at: data.accessed_at ?? new Date().toISOString(),
        })
        .eq('token', token);
    },
  });

  useEffect(() => {
    if (data) incrementAccess.mutate();
  }, [!!data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const completion = (data as any)?.completion;
  const profile = completion?.profile;

  if (!data || !completion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <LinkX className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">This link has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This certificate link is no longer active. Ask the certificate holder to generate a new share link from their APAS OS profile.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <a href="https://apasos.ai" className="text-primary hover:underline">APAS OS · apasos.ai</a>
          </p>
        </div>
      </div>
    );
  }

  const expiresLabel = data.expires_at
    ? `Expires ${format(parseISO(data.expires_at), 'MMM d, yyyy h:mm a')}`
    : '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        {/* Brand */}
        <div className="text-center">
          <span className="text-lg font-black tracking-tight text-foreground">APAS OS</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-6 space-y-4">
          {/* Holder */}
          <div className="text-center">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Award className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{profile?.full_name ?? 'Certificate Holder'}</h2>
            {profile?.job_title && <p className="text-sm text-muted-foreground">{profile.job_title}</p>}
          </div>

          <div className="border-t" />

          {/* Cert details */}
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">{completion.lw_course_id}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{format(parseISO(completion.completed_at), 'MMMM d, yyyy')}</span>
            </div>
            {completion.certificate_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Certificate ID</span>
                <span className="font-mono text-xs">{completion.certificate_id}</span>
              </div>
            )}
            {completion.expires_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{format(parseISO(completion.expires_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-green-500/10 text-green-600">
                CURRENT
              </span>
            </div>
          </div>

          {completion.certificate_url && (
            <>
              <div className="border-t" />
              <Button className="w-full" variant="outline" onClick={() => window.open(completion.certificate_url, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Certificate
              </Button>
            </>
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Verified via{' '}
            <a href="https://apasos.ai" className="text-primary hover:underline">APAS OS · apasos.ai</a>
          </p>
          {expiresLabel && <p className="text-xs text-muted-foreground">{expiresLabel}</p>}
        </div>
      </div>
    </div>
  );
}
