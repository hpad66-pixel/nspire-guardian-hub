import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  FileCheck2,
  Fingerprint,
  Gauge,
  Headphones,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  Mic2,
  PhoneCall,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Smartphone,
  UsersRound,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './onewater-landing.css';

const NAV = [
  { label: 'Platform', href: '#platform' },
  { label: 'Voice AI', href: '#voice' },
  { label: 'Workflows', href: '#workflows' },
  { label: 'Mobile', href: '#mobile' },
  { label: 'Contact', href: '#contact' },
];

const SIGNALS = [
  ['Voice calls captured', '24/7'],
  ['Project controls', 'Live'],
  ['Client portals', 'Secure'],
  ['CRM intake', 'Ready'],
];

const STREAM = [
  { label: 'VOICE AGENT', text: 'Caller says water is pooling in Unit 204. Agent confirms severity and contact details.' },
  { label: 'WORK ORDER', text: 'Urgent plumbing ticket created, on call technician notified, owner view updated.' },
  { label: 'FIELD WALK', text: 'Photos, annotation, before and after proof, and assignment history stay in one record.' },
  { label: 'FINANCIALS', text: 'Approved proposal, sub cost, billing percent, invoice package, and report attachment stay connected.' },
  { label: 'WATER INTEL', text: 'Meter data, dispute period, evidence, client comments, and letter draft remain traceable.' },
];

const VALUE_CARDS: Array<{
  icon: LucideIcon;
  label: string;
  title: string;
  copy: string;
}> = [
  {
    icon: PhoneCall,
    label: 'Voice agents',
    title: 'Calls become work instead of voicemail.',
    copy: 'After hours calls are answered, clarified, transcribed, routed, and turned into tickets with human review where it matters.',
  },
  {
    icon: ClipboardCheck,
    label: 'Field proof',
    title: 'Walkthroughs produce evidence, not loose photos.',
    copy: 'Capture before photos, owner comments, categories, responsibility, after photos, and completion confirmation from a mobile phone.',
  },
  {
    icon: ReceiptText,
    label: 'Financial control',
    title: 'Invoices are tied to proposals, subs, and progress.',
    copy: 'Pay apps, consulting invoices, subcontractor caps, reports, PDF packages, and approval locks share one record.',
  },
  {
    icon: Droplets,
    label: 'Water Intelligence',
    title: 'Utility disputes get clean analytics.',
    copy: 'Bills, meters, periods, letters, comments, and client ready evidence pages are organized for simple review.',
  },
  {
    icon: UsersRound,
    label: 'Client portals',
    title: 'The right person sees the right work.',
    copy: 'Owner, client, subcontractor, and operations views stay separate, branded, and focused on what that person must do next.',
  },
  {
    icon: Fingerprint,
    label: 'CRM boundary',
    title: 'Marketing interest flows into the workflow.',
    copy: 'Enterprise inquiries are captured as structured intake records so the team can qualify, assign, and follow up.',
  },
];

const WORKFLOWS = [
  ['Construction', 'Contracts, SOV, pay apps, change orders, retainage, closeout, and owner approval.'],
  ['Consulting', 'Proposals, branded invoices, report packages, client emails, A/R, and subcontractor controls.'],
  ['Property operations', 'Voice intake, work orders, permits, stores, inspections, water intelligence, and evidence.'],
  ['Executive oversight', 'Cockpit, dashboards, daily priorities, risk radar, messages, and client ready briefs.'],
];

type ContactState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  interest: string;
  message: string;
};

const INITIAL_CONTACT: ContactState = {
  name: '',
  email: '',
  company: '',
  phone: '',
  interest: 'Enterprise deployment',
  message: '',
};

function BrandMark() {
  return (
    <span className="ow-brand" aria-label="OneWater Work home">
      <span className="ow-brand-icon"><Waves aria-hidden="true" /></span>
      <span>
        <strong>OneWater Work</strong>
        <small>Enterprise project operating system</small>
      </span>
    </span>
  );
}

function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="ow-topbar">
      <a href="#top" className="ow-brand-link">
        <BrandMark />
      </a>
      <nav className="ow-nav" aria-label="Primary navigation">
        {NAV.map((item) => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </nav>
      <div className="ow-nav-actions">
        <Link to="/auth" className="ow-login">Sign in</Link>
        <a href="#contact" className="ow-nav-cta">Contact us <ArrowRight aria-hidden="true" /></a>
        <button className="ow-menu" type="button" aria-label="Open navigation" onClick={() => setOpen(true)}>
          <Menu aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="ow-mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="ow-mobile-menu-head">
            <BrandMark />
            <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </div>
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
          <Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link>
        </div>
      )}
    </header>
  );
}

function ProductTheater() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="ow-product-theater"
      initial={reduced ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25 }}
      aria-label="Animated product mockup"
    >
      <div className="ow-browser">
        <div className="ow-browser-top">
          <span />
          <span />
          <span />
          <strong>onewater.work/control-room</strong>
        </div>
        <div className="ow-browser-grid">
          <div className="ow-command-panel ow-command-panel-main">
            <div className="ow-panel-label">Executive cockpit</div>
            <h3>R4 portfolio health</h3>
            <div className="ow-meter">
              <span style={{ width: '83%' }} />
            </div>
            <p>Field proof, invoices, water analysis, and client comments are synchronized.</p>
          </div>
          <div className="ow-mini-card">
            <BarChart3 aria-hidden="true" />
            <strong>$53,000</strong>
            <small>Approved project value</small>
          </div>
          <div className="ow-mini-card ow-mini-card-aqua">
            <Headphones aria-hidden="true" />
            <strong>MR-1042</strong>
            <small>Voice ticket created</small>
          </div>
          <div className="ow-mini-card ow-mini-card-gold">
            <FileCheck2 aria-hidden="true" />
            <strong>Saved</strong>
            <small>Client comment attached</small>
          </div>
          <div className="ow-stream-card">
            {STREAM.slice(0, 4).map((item, index) => (
              <motion.div
                key={item.label}
                className="ow-stream-row"
                initial={reduced ? false : { opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.18 }}
              >
                <span>{item.label}</span>
                <p>{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="ow-phone" aria-label="Mobile walkthrough preview">
        <div className="ow-phone-speaker" />
        <div className="ow-phone-screen">
          <span className="ow-phone-status">Saved 12 sec ago</span>
          <h4>Walkthrough</h4>
          <div className="ow-photo-preview" />
          <button type="button">Next location</button>
          <small>Before photo, note, trade, location, owner comment</small>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section id="top" className="ow-hero">
      <img className="ow-hero-image" src="/onewater-ai-hero.png" alt="" aria-hidden="true" />
      <div className="ow-hero-overlay" />
      <div className="ow-shell ow-hero-inner">
        <motion.div
          className="ow-hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="ow-eyebrow"><span /> OneWater.ai flagship system</p>
          <h1>Project intelligence people can actually run.</h1>
          <p className="ow-hero-lede">
            OneWater Work turns voice calls, field walks, invoices, water data, portals, and client decisions into one
            clear operating system. Premium enough for executives. Simple enough for the field.
          </p>
          <div className="ow-hero-actions">
            <a className="ow-button ow-button-primary" href="#contact">Contact us <ArrowRight aria-hidden="true" /></a>
            <a className="ow-button ow-button-secondary" href="#platform">See the product</a>
          </div>
          <div className="ow-signal-strip">
            {SIGNALS.map(([label, value]) => (
              <article key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </motion.div>
        <ProductTheater />
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section id="platform" className="ow-section ow-platform">
      <div className="ow-shell">
        <div className="ow-section-head">
          <p className="ow-kicker">Why teams buy it</p>
          <h2>One operating layer for the work that keeps escaping the system.</h2>
          <p>
            The value is not another dashboard. The value is that every record knows where it came from, who touched it,
            what is next, and what the client is allowed to see.
          </p>
        </div>
        <div className="ow-value-grid">
          {VALUE_CARDS.map(({ icon: Icon, label, title, copy }) => (
            <article
              key={title}
              className="ow-value-card"
            >
              <div className="ow-value-icon"><Icon aria-hidden="true" /></div>
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function VoiceSection() {
  const [active, setActive] = useState(false);
  const transcript = useMemo(() => [
    ['Agent', 'I can help. Is the water actively pooling right now?'],
    ['Caller', 'Yes. It is under the sink and spreading.'],
    ['Agent', 'I created an urgent plumbing work order and notified the on call team.'],
  ], []);

  return (
    <section id="voice" className="ow-section ow-voice">
      <div className="ow-shell ow-two-col">
        <div>
          <p className="ow-kicker ow-kicker-dark">Voice AI and live intelligence</p>
          <h2>Show the buyer the magic, then show the audit trail.</h2>
          <p>
            Voice agents are not a gimmick. They answer, ask the next question, capture the record, trigger the workflow,
            and keep the human team in control.
          </p>
          <div className="ow-feature-list">
            <span><Mic2 aria-hidden="true" /> Field notes become punch items and reports.</span>
            <span><ShieldCheck aria-hidden="true" /> Nothing important is final without review.</span>
            <span><Gauge aria-hidden="true" /> Executives see the impact instead of the noise.</span>
          </div>
        </div>
        <div className="ow-live-brief">
          <div className="ow-live-brief-head">
            <div>
              <span className="ow-live-dot" />
              Live brief stream
            </div>
            <button type="button" onClick={() => setActive((value) => !value)}>
              {active ? 'Pause' : 'Stream demo'}
            </button>
          </div>
          <div className="ow-waveform" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <span key={index} className={active ? 'is-active' : ''} />)}
          </div>
          <div className="ow-transcript">
            {transcript.map(([who, text], index) => (
              <motion.div
                key={text}
                initial={false}
                animate={active ? { opacity: 1, y: 0 } : { opacity: index === 0 ? 1 : 0.36, y: 0 }}
                transition={{ delay: active ? index * 0.18 : 0 }}
              >
                <strong>{who}</strong>
                <p>{text}</p>
              </motion.div>
            ))}
          </div>
          <div className="ow-ticket-created">
            <CheckCircle2 aria-hidden="true" />
            <span>Ticket, transcript, priority, notification, and owner history saved.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowsSection() {
  return (
    <section id="workflows" className="ow-section ow-workflows">
      <div className="ow-shell">
        <div className="ow-section-head ow-section-head-left">
          <p className="ow-kicker">Connected workflows</p>
          <h2>Construction, consulting, operations, and intelligence in one product story.</h2>
        </div>
        <div className="ow-workflow-grid">
          {WORKFLOWS.map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileSection() {
  return (
    <section id="mobile" className="ow-section ow-mobile-section">
      <div className="ow-shell ow-two-col">
        <div className="ow-device-stack">
          <div className="ow-tablet">
            <div className="ow-tablet-nav" />
            <div className="ow-tablet-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="ow-access-card">
            <Accessibility aria-hidden="true" />
            <strong>Designed for phone, tablet, desktop, and assistive tech.</strong>
            <p>Large touch targets, clear hierarchy, readable contrast, saved states, and workflows that confirm progress.</p>
          </div>
        </div>
        <div>
          <p className="ow-kicker">Mobile first where it matters</p>
          <h2>The field user should feel calm because the system keeps confirming the work is saved.</h2>
          <p>
            The walkthrough, QR links, camera capture, galleries, and portals are built for real site conditions. Staff
            can capture now, annotate when needed, and keep moving.
          </p>
          <div className="ow-mobile-points">
            <span><Smartphone aria-hidden="true" /> Installable PWA</span>
            <span><LockKeyhole aria-hidden="true" /> Role based access</span>
            <span><BadgeCheck aria-hidden="true" /> Saved state feedback</span>
            <span><Layers3 aria-hidden="true" /> Modular activation</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [form, setForm] = useState<ContactState>(INITIAL_CONTACT);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const update = (key: keyof ContactState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    const { error: invokeError } = await supabase.functions.invoke('enterprise-contact', {
      body: {
        ...form,
        source_path: window.location.pathname,
        source_url: window.location.href,
        product: 'OneWater Work',
      },
    });
    if (invokeError) {
      setStatus('error');
      setError(invokeError.message || 'We could not submit the request. Please email info@apas.ai.');
      return;
    }
    setForm(INITIAL_CONTACT);
    setStatus('success');
  };

  return (
    <section id="contact" className="ow-section ow-contact">
      <div className="ow-shell ow-contact-grid">
        <div>
          <p className="ow-kicker ow-kicker-dark">Enterprise only</p>
          <h2>No public pricing. Start with a serious conversation.</h2>
          <p>
            Tell us what you run, where the pain is, and which modules matter first. The request is captured for the
            OneWater Work CRM workflow so the team can qualify and follow up.
          </p>
          <div className="ow-contact-promises">
            <span><Building2 aria-hidden="true" /> Portfolio and project onboarding</span>
            <span><Sparkles aria-hidden="true" /> AI, voice, and document workflows</span>
            <span><Mail aria-hidden="true" /> CRM routed follow up</span>
          </div>
        </div>
        <form className="ow-contact-form" onSubmit={submit}>
          <label>
            Name
            <input value={form.name} onChange={(event) => update('name', event.target.value)} required autoComplete="name" />
          </label>
          <label>
            Work email
            <input value={form.email} onChange={(event) => update('email', event.target.value)} required type="email" autoComplete="email" />
          </label>
          <label>
            Company
            <input value={form.company} onChange={(event) => update('company', event.target.value)} autoComplete="organization" />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" />
          </label>
          <label className="ow-form-full">
            What do you want to deploy first?
            <select value={form.interest} onChange={(event) => update('interest', event.target.value)}>
              <option>Enterprise deployment</option>
              <option>Voice agents</option>
              <option>Construction financial controls</option>
              <option>Consulting invoices and reports</option>
              <option>Field walkthroughs and portals</option>
              <option>Water Intelligence</option>
            </select>
          </label>
          <label className="ow-form-full">
            Notes
            <textarea value={form.message} onChange={(event) => update('message', event.target.value)} rows={5} />
          </label>
          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending...' : 'Contact us'} <ArrowRight aria-hidden="true" />
          </button>
          {status === 'success' && <p className="ow-form-success">Request saved. The enterprise intake is ready for follow up.</p>}
          {status === 'error' && <p className="ow-form-error">{error}</p>}
        </form>
      </div>
    </section>
  );
}

export default function OneWaterLandingPage() {
  return (
    <main className="ow-page">
      <LandingNav />
      <Hero />
      <PlatformSection />
      <VoiceSection />
      <WorkflowsSection />
      <MobileSection />
      <ContactSection />
      <footer className="ow-footer">
        <div className="ow-shell">
          <BrandMark />
          <p>OneWater Work is the enterprise front door for project, property, document, voice, and intelligence workflows.</p>
        </div>
      </footer>
    </main>
  );
}
