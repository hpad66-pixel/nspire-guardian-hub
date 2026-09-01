import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudRain,
  Construction,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  Gauge,
  HardHat,
  Headphones,
  Landmark,
  Leaf,
  Lightbulb,
  Link2,
  LockKeyhole,
  Mail,
  Map,
  Menu,
  MessageSquareText,
  Package,
  PenLine,
  Phone,
  QrCode,
  Radio,
  ReceiptText,
  Route,
  ScanLine,
  ShieldCheck,
  Siren,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UserCheck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import './r4-landing.css';

const WALKTHROUGH_MAILTO =
  'mailto:sales@apas.ai?subject=R4%20Project%20Controls%20Walkthrough&body=I%20would%20like%20to%20review%20the%20R4%20Project%20Controls%20workspace.';

const APP_URL = 'https://projos.ai';
const INSTALL_URL = 'https://projos.ai/install';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Workstreams', href: '#workstreams' },
  { label: 'Voice & alerts', href: '#voice-alerts' },
  { label: 'Financials', href: '#financial-control' },
  { label: 'Get the app', href: '#get-app' },
];

const PLATFORM_PILLARS: Array<{
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  features: Array<{ icon: LucideIcon; name: string; blurb: string }>;
  tone: 'ivory' | 'blue' | 'forest' | 'gold';
}> = [
  {
    icon: HardHat,
    eyebrow: 'Construction',
    title: 'Pay apps, field, and closeout that stay in sync',
    description:
      'AIA G702/G703 pay applications, final invoices, site maps, and project permits share one construction operating record.',
    tone: 'ivory',
    features: [
      { icon: ReceiptText, name: 'Pay Apps & Final Invoice', blurb: 'G702 cover, SOV detail, retainage QA, final-invoice banner' },
      { icon: Map, name: 'Site Asset Map', blurb: 'As-built manholes, cleanouts, pond — inspect from the pin' },
      { icon: ScanLine, name: 'Project Permits', blurb: 'Phone OCR scan, annotate, Open → City → Closed board' },
      { icon: ClipboardCheck, name: 'Closeout sync', blurb: 'Punch, metrics, and checklist tied to the final pay app' },
    ],
  },
  {
    icon: Lightbulb,
    eyebrow: 'Consulting',
    title: 'Proposal → branded invoice → running A/R',
    description:
      'Fee engagements skip construction pay apps. Bill approved proposals with editable corporate invoices and a continuous ledger.',
    tone: 'blue',
    features: [
      { icon: FileText, name: 'Approved proposals', blurb: 'Multi-proposal totals seed the invoice automatically' },
      { icon: Banknote, name: 'Corporate invoices', blurb: 'Bill-to, terms, notes, client sign-off, branded PDF' },
      { icon: Activity, name: 'Running A/R', blurb: 'Prior billed + paid continuity on every follow-on invoice' },
      { icon: Users, name: 'CRM recipients', blurb: 'Project team + full contact book for send / assign' },
    ],
  },
  {
    icon: Building2,
    eyebrow: 'Property operations',
    title: 'Voice, work orders, stores, and compliance',
    description:
      'Resident calls become tickets and work orders. Inventory issues only against a WO. Compliance permits stay phone-scannable.',
    tone: 'forest',
    features: [
      { icon: Phone, name: 'Voice Complaints', blurb: 'ElevenLabs intake → MR ticket → pending work order' },
      { icon: Wrench, name: 'Work Orders hub', blurb: 'Today / processed / backlog / aging — newest first' },
      { icon: Package, name: 'Stores & Materials', blurb: 'WO-gated issue, receipts, trends, owner brief' },
      { icon: FileCheck2, name: 'Compliance Permits', blurb: 'Property-level OCR tiles + notation for PMO compliance' },
    ],
  },
  {
    icon: Sparkles,
    eyebrow: 'Collaboration',
    title: 'Portals, Doc Studio, My Day, modular admin',
    description:
      'Owner portals are project-specific. Correspondence is signed and sent. Modules turn on only when the project needs them.',
    tone: 'gold',
    features: [
      { icon: LockKeyhole, name: 'Owner / client portals', blurb: 'One tab per project — never the wrong client view' },
      { icon: PenLine, name: 'Doc Studio', blurb: 'Upload, edit, e-sign seal, send with contact picker' },
      { icon: BadgeCheck, name: 'My Day', blurb: 'On your plate, waiting on others, address-these-first' },
      { icon: Route, name: 'Project Admin modules', blurb: 'Toggle procurement, safety, stores, voice per project' },
    ],
  },
];

const WORKSTREAMS: Array<{
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
  evidence: string;
}> = [
  {
    icon: Construction,
    number: '01',
    title: 'Sewer extension',
    description:
      'Installed quantities, tie-ins, bypass operations, testing, pay applications, change control, punch, and as-builts stay connected.',
    evidence: 'Quantities · photos · approvals · closeout',
  },
  {
    icon: CloudRain,
    number: '02',
    title: 'Stormwater & drainage',
    description:
      'Catch basins, retention, erosion controls, street conditions, field evidence, obligations, and corrective work share one record.',
    evidence: 'Inspections · permits · risks · evidence',
  },
  {
    icon: Gauge,
    number: '03',
    title: 'Water meters',
    description:
      'Installation, testing, relocation, backflow, readings, billing correspondence, deadlines, and responsible parties remain visible.',
    evidence: 'Meters · correspondence · decisions · dates',
  },
  {
    icon: ClipboardCheck,
    number: '04',
    title: 'Inspections & closeout',
    description:
      'Findings, photographs, assignments, corrective work, approvals, final inspections, and turnover documents move together.',
    evidence: 'Findings · assignments · verification · turnover',
  },
];

const CONTROL_AREAS: Array<{
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  tone: string;
}> = [
  {
    icon: Landmark,
    eyebrow: 'Money',
    title: 'Financial control',
    description:
      'The owner contract, schedule of values, approved changes, pay applications, receipts, retainage, and reports stay in one source-linked chain.',
    points: ['Contract position', 'Payment status', 'Exception visibility'],
    tone: 'gold',
  },
  {
    icon: Siren,
    eyebrow: 'Exposure',
    title: 'Risk & emergency control',
    description:
      'Critical conditions surface with severity, responsible party, next action, deadline, escalation channel, and supporting evidence.',
    points: ['Critical alerts', 'Ball in court', 'Escalation history'],
    tone: 'rose',
  },
  {
    icon: FileCheck2,
    eyebrow: 'Authority',
    title: 'Regulatory & permit control',
    description:
      'Permits, obligations, inspections, renewals, agency correspondence, and required submittals are assigned and tracked to closure.',
    points: ['Permit register', 'Agency deadlines', 'Approval evidence'],
    tone: 'blue',
  },
  {
    icon: Leaf,
    eyebrow: 'Compliance',
    title: 'Environmental control',
    description:
      'Sampling, stormwater compliance, field observations, exceedances, corrective actions, and reporting stay tied to their source records.',
    points: ['Sampling results', 'Exceedance flags', 'Corrective action'],
    tone: 'green',
  },
  {
    icon: FileSearch,
    eyebrow: 'Proof',
    title: 'Documentation control',
    description:
      'Photos, daily reports, RFIs, submittals, correspondence, meeting minutes, invoices, approvals, and closeout files remain searchable and attributable.',
    points: ['One repository', 'Version history', 'Audit lineage'],
    tone: 'cream',
  },
  {
    icon: MessageSquareText,
    eyebrow: 'Communication',
    title: 'Executive reporting',
    description:
      'Email threads, phone calls, decisions, financial status, risks, and project evidence become concise owner-ready updates and dashboards.',
    points: ['Client briefings', 'Decision log', 'Published reports'],
    tone: 'violet',
  },
];

const VOICE_STEPS = [
  {
    icon: Phone,
    label: 'Call received',
    title: '“There is active water pooling near Building 3.”',
    meta: 'ElevenLabs voice intake · 11:47 PM',
  },
  {
    icon: Headphones,
    label: 'Situation clarified',
    title: 'Location, severity, active damage, and caller contact confirmed.',
    meta: 'Transcript attached · confidence reviewed',
  },
  {
    icon: Wrench,
    label: 'Work order created',
    title: 'WO-1042 · Plumbing response · Critical priority',
    meta: 'Assigned to the on-call response team',
  },
  {
    icon: BellRing,
    label: 'Alerts escalated',
    title: 'Phone, email, and dashboard notifications issued.',
    meta: 'Acknowledgement required · timers started',
  },
  {
    icon: BadgeCheck,
    label: 'Record closed',
    title: 'Response, photos, resolution, and final verification captured.',
    meta: 'Owner-ready activity history preserved',
  },
];

const CONNECTION_FLOW = [
  { icon: Activity, label: 'Field signal' },
  { icon: UserCheck, label: 'Responsibility' },
  { icon: Wrench, label: 'Work order' },
  { icon: FileCheck2, label: 'Approval' },
  { icon: Banknote, label: 'Financial impact' },
  { icon: FileText, label: 'Owner report' },
];

const FINANCIAL_FLOW = [
  { label: 'Prime contract', meta: 'Contract of record', status: 'Executed' },
  { label: 'Schedule of values', meta: 'Cost-coded quantities', status: 'Connected' },
  { label: 'Change orders', meta: 'Scope + authorization', status: 'Controlled' },
  { label: 'Pay application', meta: 'G702 / G703', status: 'Reviewed' },
  { label: 'Payment & retainage', meta: 'Receipts + releases', status: 'Tracked' },
  { label: 'Owner report', meta: 'Published position', status: 'Ready' },
];

function BrandLockup({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className={`r4-brand-lockup ${dark ? 'r4-brand-lockup--dark' : ''} ${compact ? 'r4-brand-lockup--compact' : ''}`}>
      <span className="r4-brand-mark">APAS</span>
      <span className="r4-brand-copy">
        <strong>Project Controls</strong>
        <small>Powered by projOS</small>
      </span>
    </span>
  );
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`r4-site-header ${scrolled ? 'r4-site-header--scrolled' : ''}`}>
      <div className="r4-nav-shell">
        <a href="#top" className="r4-brand-link" aria-label="APAS Project Controls home">
          <BrandLockup dark />
        </a>

        <nav className="r4-desktop-nav" aria-label="Marketing navigation">
          {NAV_LINKS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="r4-nav-actions">
          <Link to="/auth" className="r4-sign-in-link">
            Sign in
          </Link>
          <a className="r4-nav-cta" href={WALKTHROUGH_MAILTO}>
            Request R4 walkthrough <ArrowRight aria-hidden="true" />
          </a>
          <button
            type="button"
            className="r4-menu-button"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="r4-mobile-nav"
            aria-label="Mobile marketing navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label} <ChevronRight aria-hidden="true" />
              </a>
            ))}
            <Link to="/auth" onClick={() => setOpen(false)}>
              Sign in <ChevronRight aria-hidden="true" />
            </Link>
            <a href={WALKTHROUGH_MAILTO} onClick={() => setOpen(false)}>
              Request the R4 walkthrough <ArrowRight aria-hidden="true" />
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function CommandCenterGraphic() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="r4-command-center"
      initial={reduced ? false : { opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Illustration of the R4 infrastructure command center"
    >
      <div className="r4-command-header">
        <div>
          <span className="r4-live-dot" />
          R4 infrastructure control room
        </div>
        <span>Private executive preview</span>
      </div>
      <div className="r4-command-body">
        <div className="r4-command-summary">
          <div className="r4-command-posture">
            <span className="r4-kicker">Portfolio posture</span>
            <strong>Decision-ready</strong>
            <p>Owner actions, financial exceptions, field evidence, and source documents in one brief.</p>
          </div>
          <div className="r4-command-attention">
            <span className="r4-kicker">Needs R4 now</span>
            <strong><AlertTriangle aria-hidden="true" /> 2 open reviews</strong>
            <p>Quantity adjustment and change-order authorization packet.</p>
          </div>
        </div>

        <div className="r4-command-workstreams">
          {WORKSTREAMS.map((workstream, index) => {
            const Icon = workstream.icon;
            return (
              <motion.div
                key={workstream.title}
                className="r4-command-workstream"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + index * 0.1, duration: 0.45 }}
              >
                <span className="r4-command-icon"><Icon aria-hidden="true" /></span>
                <strong>{workstream.title}</strong>
                <small><span /> Evidence current</small>
              </motion.div>
            );
          })}
        </div>

        <div className="r4-command-timeline">
          <span className="r4-command-pulse" />
          <div>
            <strong>Critical alert acknowledged</strong>
            <small>Phone + email + dashboard · response owner assigned</small>
          </div>
          <span className="r4-command-time">11:49 PM</span>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section id="top" className="r4-hero">
      <div className="r4-hero-grid" aria-hidden="true" />
      <div className="r4-hero-glow r4-hero-glow--one" aria-hidden="true" />
      <div className="r4-hero-glow r4-hero-glow--two" aria-hidden="true" />

      <div className="r4-container r4-hero-layout">
        <div className="r4-hero-copy">
          <motion.div
            className="r4-hero-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span /> Prepared for R4 Capital · Infrastructure project control
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            See every project. Control every dollar. <em>Prove every decision.</em>
          </motion.h1>

          <motion.p
            className="r4-hero-description"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Construction pay apps, consulting invoices, resident voice, stores, project permits, owner portals,
            Doc Studio, and an installable PWA — one corporate operating system for every workstream.
          </motion.p>

          <motion.div
            className="r4-hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.46 }}
          >
            <a className="r4-primary-button" href="#platform">
              Explore the platform <ArrowRight aria-hidden="true" />
            </a>
            <a className="r4-secondary-button" href="#get-app">
              <QrCode aria-hidden="true" /> Get the app
            </a>
          </motion.div>

          <motion.div
            className="r4-hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <span><ShieldCheck aria-hidden="true" /> Owner-safe access</span>
            <span><Smartphone aria-hidden="true" /> Installable PWA</span>
            <span><UserCheck aria-hidden="true" /> Human-reviewed AI</span>
            <span><LockKeyhole aria-hidden="true" /> Time-stamped history</span>
          </motion.div>
        </div>

        <CommandCenterGraphic />
      </div>

      <div className="r4-hero-proof">
        <div className="r4-container r4-hero-proof-grid">
          <div><strong>One source</strong><span>Field condition to closeout</span></div>
          <div><strong>One owner view</strong><span>Only what R4 needs</span></div>
          <div><strong>Every exception</strong><span>Exposure, owner, date, evidence</span></div>
          <div><strong>Every action</strong><span>Reviewed, attributable, traceable</span></div>
        </div>
      </div>
    </section>
  );
}

function PlatformFeatures() {
  return (
    <section id="platform" className="r4-section r4-platform-section">
      <div className="r4-container">
        <Reveal className="r4-section-heading r4-section-heading--center">
          <span className="r4-section-eyebrow">The complete platform</span>
          <h2>Every capability. One corporate operating system.</h2>
          <p>
            Construction pay apps, consulting invoices, resident voice, stores, permits, portals, and Doc Studio —
            modular by project, enterprise-ready when you need everything on.
          </p>
        </Reveal>

        <div className="r4-platform-pillars">
          {PLATFORM_PILLARS.map((pillar, index) => {
            const PillarIcon = pillar.icon;
            return (
              <Reveal key={pillar.eyebrow} className={`r4-platform-pillar r4-platform-pillar--${pillar.tone}`} delay={index * 0.08}>
                <div className="r4-platform-pillar-header">
                  <span className="r4-platform-pillar-icon"><PillarIcon aria-hidden="true" /></span>
                  <div>
                    <span className="r4-platform-eyebrow">{pillar.eyebrow}</span>
                    <h3>{pillar.title}</h3>
                  </div>
                </div>
                <p>{pillar.description}</p>
                <ul className="r4-platform-feature-list">
                  {pillar.features.map((feature) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <li key={feature.name}>
                        <span className="r4-platform-feature-icon"><FeatureIcon aria-hidden="true" /></span>
                        <div>
                          <strong>{feature.name}</strong>
                          <small>{feature.blurb}</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="r4-platform-strip" delay={0.15}>
          {[
            ['Construction vs Consulting tiles', HardHat],
            ['Phone OCR permit scan', ScanLine],
            ['ElevenLabs voice → WO', Phone],
            ['Doc Studio e-sign seal', PenLine],
            ['Owner portal project tabs', LockKeyhole],
            ['Enterprise unlocks all modules', BadgeCheck],
          ].map(([label, Icon]) => {
            const ItemIcon = Icon as LucideIcon;
            return (
              <span key={label as string}>
                <ItemIcon aria-hidden="true" /> {label as string}
              </span>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

function GetTheApp() {
  return (
    <section id="get-app" className="r4-section r4-get-app-section">
      <div className="r4-get-app-grid" aria-hidden="true" />
      <div className="r4-container r4-get-app-layout">
        <Reveal className="r4-get-app-copy">
          <span className="r4-section-eyebrow r4-section-eyebrow--dark">Progressive Web App</span>
          <h2>Install Proj OS on any phone. No app store.</h2>
          <p>
            Scan the QR code, open <strong>projos.ai</strong>, then Add to Home Screen.
            Field teams get a native-feel app with offline inspections, camera capture, voice intake, and push alerts —
            fully mobile-responsive and downloadable in seconds.
          </p>

          <div className="r4-get-app-steps">
            <div>
              <span>01</span>
              <strong>Scan the QR</strong>
              <small>Opens the install guide on your phone</small>
            </div>
            <div>
              <span>02</span>
              <strong>Add to Home Screen</strong>
              <small>Safari Share → Add · Chrome ⋮ → Install</small>
            </div>
            <div>
              <span>03</span>
              <strong>Launch like a native app</strong>
              <small>Offline-capable · instant load · push ready</small>
            </div>
          </div>

          <div className="r4-get-app-actions">
            <Link className="r4-primary-button" to="/install">
              Open install guide <ArrowRight aria-hidden="true" />
            </Link>
            <a className="r4-secondary-button" href={APP_URL} target="_blank" rel="noreferrer">
              <Download aria-hidden="true" /> projos.ai
            </a>
          </div>
        </Reveal>

        <Reveal className="r4-get-app-card" delay={0.12}>
          <div className="r4-get-app-card-header">
            <div>
              <span className="r4-live-dot" /> Corporate PWA download
            </div>
            <span>Scan with your camera</span>
          </div>

          <div className="r4-get-app-qr-frame">
            <div className="r4-get-app-qr-glow" aria-hidden="true" />
            <div className="r4-get-app-qr-inner">
              <QRCodeGenerator value={INSTALL_URL} size={220} className="r4-get-app-qr-image" />
            </div>
            <div className="r4-get-app-qr-brand">
              <QrCode aria-hidden="true" />
              <div>
                <strong>APAS Project Controls</strong>
                <small>Powered by projOS · {INSTALL_URL.replace('https://', '')}</small>
              </div>
            </div>
          </div>

          <div className="r4-get-app-benefits">
            <span><Smartphone aria-hidden="true" /> iPhone & Android</span>
            <span><CloudRain aria-hidden="true" /> Works offline</span>
            <span><BellRing aria-hidden="true" /> Push alerts</span>
            <span><ShieldCheck aria-hidden="true" /> No store required</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OperatingRecord() {
  return (
    <section id="operating-record" className="r4-section r4-operating-record">
      <div className="r4-container">
        <Reveal className="r4-section-heading r4-section-heading--split">
          <div>
            <span className="r4-section-eyebrow">One connected operating record</span>
            <h2>The condition in the field should never become an orphaned email.</h2>
          </div>
          <p>
            A phone call, inspection finding, quantity variance, permit deadline, or payment question should move
            through one accountable sequence—with the evidence, decision, cost, and final outcome still attached.
          </p>
        </Reveal>

        <Reveal className="r4-connection-flow" delay={0.12}>
          {CONNECTION_FLOW.map((item, index) => {
            const Icon = item.icon;
            return (
              <div className="r4-connection-step" key={item.label}>
                <span className="r4-connection-index">0{index + 1}</span>
                <span className="r4-connection-icon"><Icon aria-hidden="true" /></span>
                <strong>{item.label}</strong>
                {index < CONNECTION_FLOW.length - 1 && <ArrowRight className="r4-connection-arrow" aria-hidden="true" />}
              </div>
            );
          })}
        </Reveal>

        <Reveal className="r4-record-principle" delay={0.2}>
          <Link2 aria-hidden="true" />
          <div>
            <strong>Connected by source, not by retyping.</strong>
            <span>The operating record keeps the supporting email, photograph, inspection, approval, invoice, and payment within reach.</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Workstreams() {
  return (
    <section id="workstreams" className="r4-section r4-workstreams-section">
      <div className="r4-container">
        <Reveal className="r4-section-heading r4-section-heading--center">
          <span className="r4-section-eyebrow">R4 infrastructure workstreams</span>
          <h2>Four programs. One accountable record.</h2>
          <p>
            Each workstream has its own quantities, risks, correspondence, inspections, financial impact, and closeout evidence—without becoming a separate island.
          </p>
        </Reveal>

        <div className="r4-workstream-grid">
          {WORKSTREAMS.map((workstream, index) => {
            const Icon = workstream.icon;
            return (
              <Reveal key={workstream.title} className="r4-workstream-card" delay={index * 0.08}>
                <div className="r4-workstream-card-top">
                  <span className="r4-workstream-number">{workstream.number}</span>
                  <span className="r4-workstream-card-icon"><Icon aria-hidden="true" /></span>
                </div>
                <h3>{workstream.title}</h3>
                <p>{workstream.description}</p>
                <span className="r4-workstream-evidence"><BadgeCheck aria-hidden="true" /> {workstream.evidence}</span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VoiceAlerts() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % VOICE_STEPS.length), 3200);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const active = VOICE_STEPS[step];
  const ActiveIcon = active.icon;

  return (
    <section id="voice-alerts" className="r4-section r4-voice-section">
      <div className="r4-voice-grid" aria-hidden="true" />
      <div className="r4-container r4-voice-layout">
        <Reveal className="r4-voice-copy">
          <span className="r4-section-eyebrow r4-section-eyebrow--dark">ElevenLabs voice + projOS response</span>
          <h2>When the phone rings, the record starts.</h2>
          <p>
            The voice agent answers, asks the follow-up questions, captures the transcript, classifies urgency, and creates the work order. projOS then routes the right alert to the right person through the right channel.
          </p>

          <div className="r4-alert-channels">
            <span><Smartphone aria-hidden="true" /> Phone</span>
            <span><Mail aria-hidden="true" /> Email</span>
            <span><BellRing aria-hidden="true" /> Dashboard</span>
            <span><Radio aria-hidden="true" /> Escalation</span>
          </div>

          <div className="r4-critical-principle">
            <TriangleAlert aria-hidden="true" />
            <div>
              <strong>Critical means accountable.</strong>
              <span>Every alert shows who received it, who acknowledged it, what happened next, and when the condition was verified closed.</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="r4-voice-console" delay={0.12}>
          <div className="r4-voice-console-header">
            <div><span className="r4-live-dot" /> Emergency intake · live simulation</div>
            <span>Powered by ElevenLabs</span>
          </div>

          <div className="r4-waveform" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, index) => (
              <motion.span
                key={index}
                animate={reduced ? undefined : { scaleY: [0.35, 1, 0.45] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.04 }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="r4-voice-active-step"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <span className="r4-voice-step-icon"><ActiveIcon aria-hidden="true" /></span>
              <div>
                <span>{active.label}</span>
                <strong>{active.title}</strong>
                <small>{active.meta}</small>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="r4-voice-stepper" aria-label="Emergency response sequence">
            {VOICE_STEPS.map((item, index) => (
              <button
                type="button"
                key={item.label}
                className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}
                onClick={() => setStep(index)}
                aria-label={`Show step ${index + 1}: ${item.label}`}
              >
                <span>{index < step ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
                <small>{item.label}</small>
              </button>
            ))}
          </div>

          <div className="r4-alert-receipt">
            <span className="r4-alert-critical">Critical</span>
            <div><strong>WO-1042 · Active leak</strong><small>Phone 11:48 · Email 11:48 · Acknowledged 11:49</small></div>
            <BadgeCheck aria-label="Acknowledged" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ControlSystem() {
  return (
    <section id="risk-compliance" className="r4-section r4-control-section">
      <div className="r4-container">
        <Reveal className="r4-section-heading r4-section-heading--split">
          <div>
            <span className="r4-section-eyebrow">The complete control system</span>
            <h2>Every control speaks to the next one.</h2>
          </div>
          <p>
            R4 should not have to assemble the truth from separate finance, field, permit, environmental, risk, and document systems. projOS keeps the relationships visible.
          </p>
        </Reveal>

        <div className="r4-control-grid">
          {CONTROL_AREAS.map((area, index) => {
            const Icon = area.icon;
            return (
              <Reveal key={area.title} className={`r4-control-card r4-control-card--${area.tone}`} delay={(index % 3) * 0.07}>
                <div className="r4-control-card-header">
                  <span className="r4-control-card-icon"><Icon aria-hidden="true" /></span>
                  <span>{area.eyebrow}</span>
                </div>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <ul>
                  {area.points.map((point) => <li key={point}><CheckCircle2 aria-hidden="true" /> {point}</li>)}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinancialControl() {
  return (
    <section id="financial-control" className="r4-section r4-financial-section">
      <div className="r4-container r4-financial-layout">
        <Reveal className="r4-financial-copy">
          <span className="r4-section-eyebrow r4-section-eyebrow--dark">Owner-safe financial control</span>
          <h2>Every dollar keeps its source.</h2>
          <p>
            From the original agreement through approved changes, pay applications, receipts, retainage, and the owner report, the position remains traceable—and exceptions stay visible before they become disputes.
          </p>
          <div className="r4-financial-principles">
            <span><ShieldCheck aria-hidden="true" /><strong>Owner-safe view</strong><small>No subcontractor cost or APAS margin exposure.</small></span>
            <span><FileSearch aria-hidden="true" /><strong>Source-linked</strong><small>Open the number and reach the supporting record.</small></span>
            <span><AlertTriangle aria-hidden="true" /><strong>Exception-first</strong><small>Missing approvals and quantity variances cannot hide.</small></span>
          </div>
        </Reveal>

        <Reveal className="r4-financial-console" delay={0.1}>
          <div className="r4-financial-console-header">
            <div><Landmark aria-hidden="true" /> Financial control room</div>
            <span>Illustrative owner view</span>
          </div>
          <div className="r4-financial-kpis">
            <div><span>Original contract</span><strong>$523,061</strong><small>Contract of record</small></div>
            <div><span>Executed changes</span><strong>+$231,246</strong><small>Source-linked</small></div>
            <div><span>Revised contract</span><strong>$754,307</strong><small>Current position</small></div>
            <div><span>Billed to date</span><strong>96%</strong><small>Pay-app history</small></div>
          </div>
          <div className="r4-contract-bar" aria-label="Original contract plus approved changes equals revised contract">
            <span className="r4-contract-base">Original contract</span>
            <span className="r4-contract-change">Approved changes</span>
          </div>
          <div className="r4-financial-chain">
            {FINANCIAL_FLOW.map((item, index) => (
              <div className="r4-financial-step" key={item.label}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{item.label}</strong><small>{item.meta}</small></div>
                <em>{item.status}</em>
                {index < FINANCIAL_FLOW.length - 1 && <ChevronRight aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="r4-financial-exception">
            <AlertTriangle aria-hidden="true" />
            <div><strong>Exception visibility</strong><span>Quantity adjustment and authorization evidence remain open until verified.</span></div>
            <span>Review required</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HumanControl() {
  return (
    <section id="documentation" className="r4-section r4-human-section">
      <div className="r4-container">
        <Reveal className="r4-section-heading r4-section-heading--center r4-section-heading--dark">
          <span className="r4-section-eyebrow r4-section-eyebrow--dark">Human authority · AI acceleration</span>
          <h2>AI moves the paperwork. People keep the authority.</h2>
          <p>
            projOS can organize a call transcript, surface a risk, draft a letter, structure meeting minutes, build a punch list, and prepare an owner update. Authorized people review, approve, and send.
          </p>
        </Reveal>

        <div className="r4-human-grid">
          <Reveal className="r4-human-card">
            <Sparkles aria-hidden="true" />
            <span>AI prepares</span>
            <strong>Drafts grounded in the project record</strong>
            <p>Calls, emails, contracts, financials, actions, and documents provide the working context.</p>
          </Reveal>
          <Reveal className="r4-human-connector" delay={0.05}><ArrowRight aria-hidden="true" /></Reveal>
          <Reveal className="r4-human-card r4-human-card--gold" delay={0.1}>
            <UserCheck aria-hidden="true" />
            <span>People decide</span>
            <strong>Review, revise, approve, and send</strong>
            <p>Protected actions stay with authorized users; nothing leaves silently.</p>
          </Reveal>
          <Reveal className="r4-human-connector" delay={0.15}><ArrowRight aria-hidden="true" /></Reveal>
          <Reveal className="r4-human-card r4-human-card--green" delay={0.2}>
            <LockKeyhole aria-hidden="true" />
            <span>The record proves</span>
            <strong>Attributable, time-stamped history</strong>
            <p>Finalized documents, approvals, alerts, and activity remain traceable.</p>
          </Reveal>
        </div>

        <Reveal className="r4-enterprise-strip" delay={0.2}>
          {[
            ['Role-based access', ShieldCheck],
            ['Tenant isolation', Building2],
            ['Approval boundaries', BadgeCheck],
            ['Audit history', FileSearch],
            ['Owner-safe portals', LockKeyhole],
            ['API + integrations', Route],
          ].map(([label, Icon]) => {
            const ItemIcon = Icon as LucideIcon;
            return <span key={label as string}><ItemIcon aria-hidden="true" /> {label as string}</span>;
          })}
        </Reveal>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="r4-final-cta">
      <div className="r4-final-grid" aria-hidden="true" />
      <div className="r4-container r4-final-layout">
        <Reveal>
          <span className="r4-section-eyebrow r4-section-eyebrow--dark">Start with one real project</span>
          <h2>Give R4 one place to say, “Show me.”</h2>
          <p>
            Start with Glorieta. Validate the contract, quantities, approved changes, billings, payments, inspections, risks, and supporting documents. Then invite R4 into the owner-safe command center.
          </p>
        </Reveal>
        <Reveal className="r4-final-actions" delay={0.12}>
          <a className="r4-primary-button" href={WALKTHROUGH_MAILTO}>Schedule the R4 working session <ArrowRight aria-hidden="true" /></a>
          <Link className="r4-secondary-button" to="/auth"><LockKeyhole aria-hidden="true" /> Enter your workspace</Link>
          <span>Pilot one project · Validate the record · Expand after R4 signs off</span>
        </Reveal>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="r4-footer">
      <div className="r4-container r4-footer-main">
        <div className="r4-footer-brand">
          <BrandLockup dark />
          <p>Owner visibility, financial control, risk accountability, and defensible documentation across every workstream.</p>
        </div>
        <div className="r4-footer-column">
          <strong>Platform</strong>
          <a href="#platform">All features</a>
          <a href="#workstreams">Workstreams</a>
          <a href="#voice-alerts">Voice & alerts</a>
          <a href="#financial-control">Financial control</a>
          <a href="#get-app">Get the app</a>
        </div>
        <div className="r4-footer-column">
          <strong>Access</strong>
          <Link to="/auth">Sign in</Link>
          <Link to="/install">Install PWA</Link>
          <a href={WALKTHROUGH_MAILTO}>Request walkthrough</a>
          <a href={APP_URL}>projos.ai</a>
        </div>
        <div className="r4-footer-column r4-footer-contact">
          <strong>Contact</strong>
          <a href="mailto:sales@apas.ai">sales@apas.ai</a>
          <span>Florida · United States</span>
          <small>Prepared for R4 Capital</small>
        </div>
      </div>
      <div className="r4-container r4-footer-bottom">
        <span>© {new Date().getFullYear()} APAS Consulting · projOS</span>
        <span>Technology for teams that need to do more, prove more, and protect project value.</span>
      </div>
    </footer>
  );
}

export default function R4LandingPage() {
  return (
    <div className="r4-marketing-page">
      <MarketingNav />
      <main>
        <Hero />
        <PlatformFeatures />
        <OperatingRecord />
        <Workstreams />
        <VoiceAlerts />
        <ControlSystem />
        <FinancialControl />
        <HumanControl />
        <GetTheApp />
        <FinalCallToAction />
      </main>
      <MarketingFooter />
    </div>
  );
}
