import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { Smartphone, Apple, ArrowRight, CheckCircle2, Share, Plus, Chrome } from 'lucide-react';

const APP_URL = 'https://apasos.lovable.app';

const iosSteps = [
  { icon: Share, text: 'Open the app in Safari, then tap the Share button (box with arrow) at the bottom of the screen.' },
  { icon: Plus, text: 'Scroll down in the Share sheet and tap "Add to Home Screen".' },
  { icon: CheckCircle2, text: 'Tap "Add" in the top-right corner. APAS OS will appear on your home screen like a native app.' },
];

const androidSteps = [
  { icon: Chrome, text: 'Open the app in Chrome. Tap the three-dot menu (⋮) in the top-right corner.' },
  { icon: Plus, text: 'Tap "Add to Home Screen" or "Install App" from the menu.' },
  { icon: CheckCircle2, text: 'Confirm by tapping "Install". APAS OS will appear on your home screen.' },
];

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icons/apas-os-192.png" alt="APAS OS" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-foreground">APAS OS</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm">Sign In</Button>
        </Link>
      </header>

      <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="h-20 w-20 mx-auto rounded-2xl overflow-hidden shadow-lg">
            <img src="/icons/apas-os-512.png" alt="APAS OS" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Install APAS OS</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Add APAS OS to your home screen for fast, offline-capable access — no app store required.
          </p>
          <Link to="/dashboard">
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
            Scan this QR code with your phone to open APAS OS on mobile, then follow the steps above.
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
        <p className="text-xs text-muted-foreground">APAS OS — One platform to run everything.</p>
      </footer>
    </div>
  );
}
