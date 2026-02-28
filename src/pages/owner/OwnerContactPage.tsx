import { Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OwnerContactPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-sm text-center">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          APAS Consulting LLC
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Hardeep Anand, P.E.</h1>
        <p className="mt-1 text-sm text-muted-foreground">Principal | Owner's Representative</p>

        <div className="my-6 border-t border-border" />

        <div className="space-y-3 text-sm">
          <a
            href="mailto:hardeep@apas.ai"
            className="flex items-center justify-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            hardeep@apas.ai
          </a>
          <a
            href="https://apasos.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            apasos.ai
          </a>
        </div>

        <Button className="mt-6 w-full" asChild>
          <a href="mailto:hardeep@apas.ai?subject=Meeting Request">
            Schedule a Meeting
          </a>
        </Button>

        <div className="my-6 border-t border-border" />

        <p className="text-xs italic text-muted-foreground">
          For urgent on-site issues, contact your on-site superintendent directly.
        </p>
      </div>
    </div>
  );
}
