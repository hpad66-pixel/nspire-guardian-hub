import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { usePWAInstall } from '@/hooks/usePWA';
import { Smartphone, Apple, ArrowRight, CheckCircle2, Share, Plus, Chrome, Download, MonitorDown } from 'lucide-react';

const APP_URL = 'https://projos.ai';

const iosSteps = [
  { icon: Share, text: 'Open the app in Safari, then tap the Share button (box with arrow) at the bottom of the screen.' },
  { icon: Plus, text: 'Scroll down in the Share sheet and tap "Add to Home Screen".' },
  { icon: CheckCircle2, text: 'Tap "Add" in the top-right corner. Proj OS will appear on your home screen like a native app.' },
];

const androidSteps = [
  { icon: Chrome, text: 'Open the app in Chrome. Tap the three-dot menu (⋮) in the top-right corner.' },
  { icon: Plus, text: 'Tap "Add to Home Screen" or "Install App" from the menu.' },
  { icon: CheckCircle2, text: 'Confirm by tapping "Install". Proj OS will appear on your home screen.' },
];

const desktopSteps = [
  { icon: Chrome, text: 'Open Proj OS in Chrome or Microsoft Edge on your computer.' },
  { icon: MonitorDown, text: 'Click the install icon in the address bar, or open the browser menu and choose "Install Proj OS".' },
  { icon: CheckCircle2, text: 'Confirm the install. Proj OS will open as a desktop app with its own window.' },
];

export default function InstallPage() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/icons/apas-os-192.png" alt="Proj OS" className="h-8 w-8 shrink-0 rounded-lg" />
          <span className="truncate font-semibold text-foreground">Proj OS</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm" className="min-h-[40px]">Sign In</Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-12 px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl shadow-lg">
            <img src="/icons/apas-os-512.png" alt="Proj OS" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Install Proj OS</h1>
          <p className="mx-auto max-w-sm text-muted-foreground">
            Add the Proj OS workspace to your home screen for fast, offline-capable project access. No app store required.
          </p>
          <Link to="/portals">
            <Button className="gap-2">
              Already Installed? Open App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Desktop install */}
        <section className="overflow-hidden rounded-3xl border border-[rgba(213,170,82,0.36)] bg-[linear-gradient(135deg,#10151f_0%,#1d2533_55%,#22364f_100%)] text-white shadow-[0_24px_70px_rgba(16,21,31,0.18)]">
          <div className="h-1.5 bg-[linear-gradient(90deg,#d5aa52,#f2d997,#71a8cf)]" />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10">
                <MonitorDown className="h-6 w-6 text-[#f2d997]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f2d997]">Desktop app</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Install Proj OS on this computer</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/76">
                  Chrome and Edge can install Proj OS as a desktop app. If the browser install prompt is available, use the button below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isInstalled ? (
                <Button className="bg-[#d5aa52] text-[#10151f] hover:bg-[#f2d997]" asChild>
                  <Link to="/dashboard">Open installed app</Link>
                </Button>
              ) : (
                <Button className="gap-2 bg-[#d5aa52] text-[#10151f] hover:bg-[#f2d997]" onClick={() => void install()}>
                  <Download className="h-4 w-4" />
                  {isInstallable ? 'Install desktop app' : 'Show desktop install steps'}
                </Button>
              )}
              <Button variant="outline" className="border-white/25 bg-white/8 text-white hover:bg-white/14 hover:text-white" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
            {!isInstallable && !isInstalled && (
              <p className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-xs leading-relaxed text-white/72">
                If the button does not open the browser install prompt, use the three-dot browser menu and choose <strong>Install Proj OS</strong>.
                Some browsers hide the prompt after it was dismissed or when the app is already installed.
              </p>
            )}
          </div>
        </section>

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

        {/* Desktop instructions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MonitorDown className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Desktop (Chrome / Edge)</h2>
          </div>
          <div className="space-y-3">
            {desktopSteps.map((step, i) => (
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
            Scan this QR code with your phone to open Proj OS on mobile, then follow the steps above.
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
        <p className="text-xs text-muted-foreground">Proj OS · APAS</p>
      </footer>
    </div>
  );
}
