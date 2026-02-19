import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BadgeCheck, Link2Off, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  getCredentialStatus,
  formatExpiryDate,
  type Credential,
  type ShareLink,
} from '@/hooks/useCredentials';
import { CredentialStatusBadge } from '@/components/credentials/CredentialStatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SharePageData {
  shareLink: ShareLink;
  credential: Credential & {
    holder: {
      user_id: string;
      full_name: string | null;
      avatar_url: string | null;
      job_title: string | null;
      department: string | null;
    };
  };
}

export default function CredentialSharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['credential-share', token],
    queryFn: async (): Promise<SharePageData | null> => {
      if (!token) return null;

      // Fetch share link
      const { data: link, error: linkErr } = await supabase
        .from('credential_share_links')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (linkErr || !link) return null;

      const shareLink = link as ShareLink;

      // Check validity
      if (shareLink.revoked) return null;
      if (new Date(shareLink.expires_at) < new Date()) return null;

      // Fetch credential + holder
      const { data: cred, error: credErr } = await supabase
        .from('credentials')
        .select(`
          *,
          holder:profiles!credentials_holder_id_fkey(user_id, full_name, avatar_url, job_title, department)
        `)
        .eq('id', shareLink.credential_id)
        .maybeSingle();

      if (credErr || !cred) return null;

      return { shareLink, credential: cred as SharePageData['credential'] };
    },
    staleTime: 0,
  });

  // Record access
  const recordAccess = useMutation({
    mutationFn: async (shareLinkId: string) => {
      await supabase
        .from('credential_share_links')
        .update({
          access_count: (data?.shareLink.access_count ?? 0) + 1,
          accessed_at: data?.shareLink.accessed_at ?? new Date().toISOString(),
        })
        .eq('id', shareLinkId);
    },
  });

  useEffect(() => {
    if (data?.shareLink.id) {
      recordAccess.mutate(data.shareLink.id);
    }
  }, [data?.shareLink.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Expired or invalid
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BadgeCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">APAS OS</span>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <Link2Off className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">This link has expired</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This credential link is no longer active. Ask the credential holder to
              generate a new share link from their APAS OS profile.
            </p>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Verified via{' '}
            <a href="https://apasos.ai" className="text-primary hover:underline">
              APAS OS · apasos.ai
            </a>
          </p>
        </div>
      </div>
    );
  }

  const { credential, shareLink } = data;
  const holder = credential.holder;
  const holderName = holder.full_name || 'Team Member';
  const credLabel = credential.custom_type_label || credential.credential_type;
  const status = getCredentialStatus(credential.expiry_date);
  const expiresAt = new Date(shareLink.expires_at);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <BadgeCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">APAS OS</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Holder header */}
        <div className="flex items-center gap-3 border-b px-6 py-4 bg-muted/30">
          <Avatar className="h-10 w-10">
            <AvatarImage src={holder.avatar_url ?? undefined} />
            <AvatarFallback className="text-sm font-semibold">
              {holderName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{holderName}</p>
            {(holder.job_title || holder.department) && (
              <p className="text-xs text-muted-foreground">
                {[holder.job_title, holder.department].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Credential details */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Credential</p>
            <p className="text-xl font-bold text-foreground">{credLabel}</p>
          </div>

          <CredentialStatusBadge status={status} size="lg" />

          <div className="space-y-2 pt-1">
            {credential.issuing_authority && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Issued by</span>
                <span className="font-medium text-foreground">{credential.issuing_authority}</span>
              </div>
            )}
            {credential.credential_number && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">License #</span>
                <span className="font-medium font-mono text-foreground">{credential.credential_number}</span>
              </div>
            )}
            {credential.issue_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Issue Date</span>
                <span className="font-medium text-foreground">{formatExpiryDate(credential.issue_date)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expiry Date</span>
              <span className="font-medium text-foreground">{formatExpiryDate(credential.expiry_date)}</span>
            </div>
          </div>

          {credential.document_url && (
            <>
              <div className="border-t pt-4">
                <Button className="w-full" variant="outline" asChild>
                  <a href={credential.document_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Document
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 space-y-1 text-center">
        <p className="text-xs text-muted-foreground">
          Verified via{' '}
          <a href="https://apasos.ai" className="text-primary hover:underline">
            APAS OS · apasos.ai
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Link expires{' '}
          {expiresAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
