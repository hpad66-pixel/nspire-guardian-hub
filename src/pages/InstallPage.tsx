import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { Smartphone, Apple, ArrowRight, CheckCircle2, Share, Plus, Chrome } from 'lucide-react';

const APP_URL = 'https://projos.ai';

const iosSteps = [
  { icon: Share, text: 'Open the app in Safari, then tap the Share button (box with arrow) at the bottom of the screen.' },
  { icon: Plus, text: 'Scroll down in the Share sheet and tap "Add to Home Screen".' },
  { icon: CheckCircle2, text: 'Tap "Add" in the top-right corner. APAS Project Controls will appear on your home screen like a native app.' },
];

const androidSteps = [
  { icon: Chrome, text: 'Open the app in Chrome. Tap the three-dot menu (⋮) in the top-right corner.' },
  { icon: Plus, text: 'Tap "Add to Home Screen" or "Install App" from the menu.' },
  { icon: CheckCircle2, text: 'Confirm by tapping "Install". APAS Project Controls will appear on your home screen.' },
];

export default function InstallPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/icons/apas-os-192.png" alt="APAS Project Controls" className="h-8 w-8 shrink-0 rounded-lg" />
          <span className="truncate font-semibold text-foreground">APAS Project Controls</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm" className="min-h-[40px]">Sign In</Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-12 px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl shadow-lg">
            <img src="/icons/apas-os-512.png" alt="APAS Project Controls" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Install APAS Project Controls</h1>
          <p className="mx-auto max-w-sm text-muted-foreground">
            Add the projOS-powered APAS workspace to your home screen for fast, offline-capable access — no app store required. Fully mobile-responsive and downloadable as a web app.
          </p>
          <Link to="/portals">
            <Button className="gap-2">
              Already Installed? Open App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* iOS Instructions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5" />
            <h2 className="text-xl font-semibold">iPhone / iPad (iOS Safari)</h2>
          </div>
          <div className="space-y-3">
            {iosSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex items-start gap-3 flex-1">
                  <step.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Push notifications on iOS require iOS 16.4+ and the app must be opened from the home screen.
          </p>
        </section>

        {/* Android Instructions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Android (Chrome)</h2>
          </div>
          <div className="space-y-3">
            {androidSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex items-start gap-3 flex-1">
                  <step.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* QR Code for Desktop */}
        <section className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">On a computer?</h2>
          <p className="text-muted-foreground text-sm">
            Scan this QR code with your phone to open APAS Project Controls on mobile, then follow the steps above.
          </p>
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-md inline-block">
              <QRCodeGenerator value={APP_URL} size={160} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{APP_URL}</p>
        </section>

        {/* Features */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: 'Works Offline', desc: 'Inspections sync when reconnected' },
            { label: 'Instant Notifications', desc: 'Push alerts for work orders & mentions' },
            { label: 'Home Screen App', desc: 'No app store needed' },
            { label: 'Fast Load', desc: 'Cached for near-instant startup' },
          ].map((f) => (
            <div key={f.label} className="p-4 rounded-xl border border-border bg-card space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">APAS Project Controls · Powered by projOS</p>
      </footer>
    </div>
  );
}
