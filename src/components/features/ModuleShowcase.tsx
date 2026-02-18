import { motion } from 'framer-motion';
import { 
  Mic, Camera, AlertCircle, CheckCircle2, Shield, Clock, Wrench, FileCheck,
  Calendar, Bell, FileText, FolderOpen, Search, History, ClipboardList, Receipt,
  FileQuestion, Sparkles, Hammer, GitBranch, Flag, MessageSquare, Users, UserCog,
  GraduationCap, Send, BarChart3, PieChart, Download, MessageCircle, Zap, AtSign,
  Archive, Lock, BookOpen, Milestone,
} from 'lucide-react';

// ─── Card visual components ───────────────────────────────────────────────────

function VisualCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--apas-surface)', border: '1px solid var(--apas-border)', borderRadius: '20px', padding: '24px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
      {children}
    </div>
  );
}

function CardLabel({ text, color = 'var(--apas-muted)' }: { text: string; color?: string }) {
  return <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color, marginTop: '2px' }}>{text}</p>;
}

function CardTitle({ text }: { text: string }) {
  return <p style={{ fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 600, color: 'var(--apas-white)' }}>{text}</p>;
}

function RowItem({ children, bg = 'rgba(255,255,255,0.04)' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', background: bg }}>
      {children}
    </div>
  );
}

// ─── Visual variants ──────────────────────────────────────────────────────────

type VisualType = 'inspections' | 'compliance' | 'permits' | 'documents' | 'archives' | 'projects' | 'workorders' | 'team' | 'messaging' | 'analytics';

function ModuleVisual({ type }: { type: VisualType }) {
  switch (type) {
    case 'inspections':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ height: '40px', width: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={18} color="#10B981" />
            </div>
            <div>
              <CardTitle text="Daily Grounds Inspection" />
              <CardLabel text="Today, 8:42 AM" color="#10B981" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Parking Lot A', done: true },
              { label: 'Playground Equipment', done: true },
              { label: 'Building Exterior', done: false },
            ].map(item => (
              <RowItem key={item.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color={item.done ? '#10B981' : 'var(--apas-muted)'} />
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>{item.label}</span>
                </div>
                {item.done && <Camera size={14} color="var(--apas-muted)" />}
              </RowItem>
            ))}
          </div>
        </VisualCard>
      );

    case 'compliance':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="NSPIRE Status" />
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: '999px', padding: '4px 12px', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600 }}>Compliant</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: 'Outside Areas', items: 0 },
              { label: 'Inside Common', items: 0 },
              { label: 'Unit Inspections', items: 2 },
            ].map(area => (
              <RowItem key={area.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.items === 0 ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>{area.label}</span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: area.items > 0 ? '#F59E0B' : 'var(--apas-muted)' }}>
                  {area.items > 0 ? `${area.items} items` : 'All clear'}
                </span>
              </RowItem>
            ))}
          </div>
          <div style={{ background: 'rgba(29,111,232,0.1)', border: '1px solid rgba(29,111,232,0.2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>NSPIRE Score</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', fontWeight: 700, color: 'var(--apas-sapphire)' }}>94.2</span>
          </div>
        </VisualCard>
      );

    case 'permits':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="Permit Calendar" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>Feb 2026</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Fire Safety Cert', days: '12d', color: '#F43F5E' },
              { name: 'Elevator Inspection', days: '45d', color: '#F59E0B' },
              { name: 'Stormwater Permit', days: '90d', color: '#10B981' },
            ].map(p => (
              <RowItem key={p.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCheck size={15} color={p.color} />
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>{p.name}</span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: p.color, fontWeight: 600 }}>{p.days}</span>
              </RowItem>
            ))}
          </div>
        </VisualCard>
      );

    case 'documents':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
            <Search size={14} color="var(--apas-muted)" />
            <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)' }}>Search documents...</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { name: 'Contracts', count: 12, color: '#1D6FE8' },
              { name: 'Insurance', count: 4, color: '#10B981' },
              { name: 'Policies', count: 8, color: '#F59E0B' },
              { name: 'Legal', count: 6, color: '#F43F5E' },
            ].map(f => (
              <RowItem key={f.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderOpen size={15} color={f.color} />
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: 'var(--apas-white)' }}>{f.name}</span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>{f.count} files</span>
              </RowItem>
            ))}
          </div>
        </VisualCard>
      );

    case 'archives':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ height: '40px', width: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={18} color="white" />
            </div>
            <div>
              <CardTitle text="Property Archives" />
              <CardLabel text="Permanent retention vault" color="#F59E0B" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'As-Built Drawings', count: 24 },
              { name: 'Equipment Manuals', count: 18 },
              { name: 'Permits & Approvals', count: 12 },
            ].map(cat => (
              <RowItem key={cat.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={14} color="#F59E0B" />
                  <span style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>{cat.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={11} color="var(--apas-muted)" />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>{cat.count}</span>
                </div>
              </RowItem>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--apas-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={12} color="var(--apas-muted)" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>Documents cannot be deleted</span>
          </div>
        </VisualCard>
      );

    case 'projects':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <CardTitle text="Roof Replacement" />
            <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', borderRadius: '999px', padding: '4px 12px', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600 }}>Active</span>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', borderRadius: '999px', background: 'linear-gradient(90deg, #8B5CF6, #6D28D9)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)' }}>Progress</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#8B5CF6', fontWeight: 600 }}>60%</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { v: '12', l: 'Daily Reports' },
              { v: '3', l: 'Open RFIs' },
              { v: '$45K', l: 'Change Orders' },
            ].map(m => (
              <div key={m.l} style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', fontWeight: 700, color: 'var(--apas-white)' }}>{m.v}</p>
                <p style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--apas-muted)', marginTop: '2px' }}>{m.l}</p>
              </div>
            ))}
          </div>
        </VisualCard>
      );

    case 'workorders':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="Work Orders" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>This Week</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { title: 'HVAC Unit B3', status: 'In Progress', priority: '#F43F5E' },
              { title: 'Parking Light #7', status: 'Assigned', priority: '#F59E0B' },
              { title: 'Lobby Door Seal', status: 'Completed', priority: '#10B981' },
            ].map(wo => (
              <RowItem key={wo.title}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: wo.priority, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: 'var(--apas-white)' }}>{wo.title}</p>
                    <p style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--apas-muted)' }}>{wo.status}</p>
                  </div>
                </div>
                <Wrench size={14} color="var(--apas-muted)" />
              </RowItem>
            ))}
          </div>
        </VisualCard>
      );

    case 'team':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="Team Members" />
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: '999px', padding: '4px 12px', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600 }}>8 Active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'Maria Garcia', role: 'Property Manager', initials: 'MG', color: '#1D6FE8' },
              { name: 'James Wilson', role: 'Superintendent', initials: 'JW', color: '#F59E0B' },
              { name: 'Lisa Chen', role: 'Inspector', initials: 'LC', color: '#10B981' },
            ].map(m => (
              <RowItem key={m.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ height: '36px', width: '36px', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 700, color: 'white' }}>{m.initials}</div>
                  <div>
                    <p style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: 'var(--apas-white)' }}>{m.name}</p>
                    <p style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--apas-muted)' }}>{m.role}</p>
                  </div>
                </div>
              </RowItem>
            ))}
          </div>
        </VisualCard>
      );

    case 'messaging':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="Team Messages" />
            <div style={{ height: '20px', width: '20px', borderRadius: '50%', background: 'var(--apas-sapphire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 700, color: 'white' }}>3</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>Inspection complete for Building A! 🎉</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)', marginTop: '4px' }}>Maria · 2m ago</p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '14px 14px 4px 14px', background: 'rgba(29,111,232,0.15)', border: '1px solid rgba(29,111,232,0.2)', marginLeft: '32px' }}>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-white)' }}>Great work! Moving to Building B now.</p>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)', marginTop: '4px' }}>You · Just now</p>
            </div>
          </div>
        </VisualCard>
      );

    case 'analytics':
      return (
        <VisualCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <CardTitle text="Monthly Overview" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-muted)' }}>Feb 2026</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: PieChart, v: '94%', l: 'Compliance Rate', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
              { icon: BarChart3, v: '127', l: 'Inspections', color: '#1D6FE8', bg: 'rgba(29,111,232,0.12)' },
              { icon: Wrench, v: '48', l: 'Work Orders', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
              { icon: Clock, v: '2.3d', l: 'Avg Resolution', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
            ].map(m => (
              <div key={m.l} style={{ padding: '16px', borderRadius: '12px', background: m.bg }}>
                <m.icon size={16} color={m.color} style={{ marginBottom: '8px' }} />
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 700, color: 'var(--apas-white)' }}>{m.v}</p>
                <p style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--apas-muted)', marginTop: '2px' }}>{m.l}</p>
              </div>
            ))}
          </div>
        </VisualCard>
      );

    default:
      return null;
  }
}

// ─── Module section ───────────────────────────────────────────────────────────

interface ModuleProps {
  eyebrow: string;
  eyebrowColor: string;
  headline: string;
  description: string;
  points: { icon: React.ElementType; text: string }[];
  visual: VisualType;
  reversed?: boolean;
}

function ModuleSection({ eyebrow, eyebrowColor, headline, description, points, visual, reversed }: ModuleProps) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
      >
        <div
          className="inline-flex items-center gap-2 mb-5"
          style={{ background: `${eyebrowColor}18`, border: `1px solid ${eyebrowColor}35`, borderRadius: '999px', padding: '5px 14px' }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: eyebrowColor, flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: eyebrowColor, letterSpacing: '0.03em' }}>{eyebrow}</span>
        </div>
        <h3 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(26px, 3.5vw, 40px)', color: 'var(--apas-white)', lineHeight: 1.1, marginBottom: '16px' }}>{headline}</h3>
        <p style={{ fontFamily: 'DM Sans', fontSize: '16px', color: 'var(--apas-muted)', lineHeight: 1.8, marginBottom: '28px' }}>{description}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {points.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              viewport={{ once: true }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}
            >
              <div style={{ height: '32px', width: '32px', minWidth: '32px', borderRadius: '8px', background: `${eyebrowColor}18`, border: `1px solid ${eyebrowColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <point.icon size={15} color={eyebrowColor} />
              </div>
              <p style={{ fontFamily: 'DM Sans', fontSize: '15px', color: 'var(--apas-muted)', lineHeight: 1.7 }}>{point.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Visual */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
      >
        <ModuleVisual type={visual} />
      </motion.div>
    </div>
  );
}

// ─── Module data ──────────────────────────────────────────────────────────────

const modules: ModuleProps[] = [
  {
    eyebrow: 'Daily Inspections',
    eyebrowColor: '#10B981',
    headline: 'Every Corner. Every Day. Documented.',
    description: 'Your grounds inspection should produce undeniable photographic proof, not a handwritten checklist nobody can find.',
    points: [
      { icon: Mic, text: 'Voice dictation in English and Spanish — speak your findings, AI transcribes them' },
      { icon: Camera, text: 'Photo evidence with GPS coordinates and timestamps — court-admissible proof' },
      { icon: AlertCircle, text: 'Defects auto-generate issues and work orders — nothing falls through after the walk' },
      { icon: CheckCircle2, text: 'Supervisor review queue with one-tap approval, reviewer notes, and addendum support' },
    ],
    visual: 'inspections',
  },
  {
    eyebrow: 'NSPIRE Compliance',
    eyebrowColor: '#1D6FE8',
    headline: 'HUD-Ready. Every Single Day.',
    description: 'The complete NSPIRE defect catalog is built in. 80+ defect items across three areas. Every defect has its severity, deadline, and point value pre-loaded.',
    points: [
      { icon: Shield, text: 'Complete NSPIRE defect catalog: 35 Outside · 28 Inside · 22+ Unit items' },
      { icon: Clock, text: 'Repair deadline enforcement: 24h Life-Threatening · 30d Severe · 60d Moderate' },
      { icon: Wrench, text: 'Defects auto-create work orders — the pipeline from inspection to resolution never breaks' },
      { icon: History, text: '3-year audit trail retention — every inspection, finding, and resolution archived' },
    ],
    visual: 'compliance',
    reversed: true,
  },
  {
    eyebrow: 'Permit Center',
    eyebrowColor: '#8B5CF6',
    headline: 'Never Miss a Regulatory Deadline. Ever.',
    description: 'Fire safety certificates. Elevator inspections. Stormwater permits. One missed deadline can mean shutdown, fines, or liability. APAS OS tracks every one.',
    points: [
      { icon: FileCheck, text: 'Expiration tracking for every permit, license, certificate, and insurance document' },
      { icon: Bell, text: 'Automated alerts at 90, 60, 30, 14, and 7 days before expiration' },
      { icon: Calendar, text: 'Deliverable tracking: log requirements, due dates, and responsible parties' },
      { icon: AlertCircle, text: 'Overdue items auto-generate issues and notify supervisors' },
    ],
    visual: 'permits',
  },
  {
    eyebrow: 'Document Center',
    eyebrowColor: '#F59E0B',
    headline: 'Your Digital Filing Cabinet.',
    description: 'Documents organized, version-controlled, searchable, and expiration-tracked. Archives is the permanent vault where as-built drawings and approved permits live forever.',
    points: [
      { icon: FolderOpen, text: 'Organized by Contracts · Insurance · Policies · Legal · Permits' },
      { icon: Search, text: 'Instant full-text search across all files — find anything in seconds' },
      { icon: Lock, text: 'Property Archives: permanent storage, admin-upload-only, view-only for teams' },
      { icon: FileCheck, text: 'Expiration date tracking for contracts and insurance certificates' },
    ],
    visual: 'documents',
    reversed: true,
  },
  {
    eyebrow: 'Project Management',
    eyebrowColor: '#8B5CF6',
    headline: 'Capital Projects. Total Visibility.',
    description: 'Milestones, daily reports, RFIs, submittals, change orders, punch lists, financials, safety logs. Everything a construction manager needs — without Procore prices.',
    points: [
      { icon: Milestone, text: 'Gantt chart + milestone timeline with visual progress tracking' },
      { icon: ClipboardList, text: 'Daily reports with photo documentation and voice dictation (printable PDF)' },
      { icon: Receipt, text: 'Change order approval workflow with cost tracking and budget variance' },
      { icon: Sparkles, text: 'AI-powered proposal generation — describe the scope, get a professional draft' },
    ],
    visual: 'projects',
  },
  {
    eyebrow: 'Work Orders',
    eyebrowColor: '#F59E0B',
    headline: 'From Defect to Done. Nothing Lost.',
    description: 'Every inspection defect, tenant complaint, and AI voice call creates a tracked work order. Five-stage pipeline with activity log and priority levels.',
    points: [
      { icon: Hammer, text: 'Auto-created from inspection defects, issues, and AI Voice Agent calls' },
      { icon: GitBranch, text: '5-stage pipeline: Created → Assigned → In Progress → Review → Completed' },
      { icon: Flag, text: 'Priority levels: Critical · High · Medium · Low with SLA tracking' },
      { icon: MessageSquare, text: 'Comment threads and @mentions within each work order' },
    ],
    visual: 'workorders',
    reversed: true,
  },
  {
    eyebrow: 'Team Management',
    eyebrowColor: '#1D6FE8',
    headline: 'The Right Access. For Every Role.',
    description: 'Nine permission levels. Property-specific assignments. Invitation system for contractors. Training tracking with digital certificate generation.',
    points: [
      { icon: Users, text: '9 role levels: Owner → Administrator → Property Manager → Inspector → Viewer' },
      { icon: UserCog, text: 'Property-specific assignments — users only see the properties they\'re assigned to' },
      { icon: GraduationCap, text: 'Training courses with progress tracking and digital certificate generation' },
      { icon: Send, text: 'Invitation system for contractors, vendors, and external teams' },
    ],
    visual: 'team',
  },
  {
    eyebrow: 'Communications',
    eyebrowColor: '#F43F5E',
    headline: 'Your Team. In Sync.',
    description: 'iMessage-style team messaging with threads, @mentions, and search history. Full email integration with complete audit trail. All in one platform.',
    points: [
      { icon: MessageCircle, text: 'Threaded messaging with @mentions and instant read receipts' },
      { icon: Zap, text: 'Full email integration: inbox, compose, reply, forward — with audit trail' },
      { icon: AtSign, text: 'Smart notification center: deadline alerts, work order updates, approvals' },
      { icon: History, text: 'Full message history search — never lose a conversation' },
    ],
    visual: 'messaging',
    reversed: true,
  },
  {
    eyebrow: 'Analytics & Reporting',
    eyebrowColor: '#06B6D4',
    headline: 'Decisions Backed by Data.',
    description: 'Portfolio-level analytics across all properties. Nine built-in report types. CSV export for every table. Printable PDF reports for audits and owner presentations.',
    points: [
      { icon: PieChart, text: 'Portfolio dashboard: compliance rate · open issues · work orders · velocity' },
      { icon: BarChart3, text: '9 report types: Inspection Summary, Defect Analysis, Work Order Performance...' },
      { icon: Download, text: 'CSV export for all data tables — works with Excel and accounting tools' },
    ],
    visual: 'analytics',
  },
];

// ─── Export ───────────────────────────────────────────────────────────────────

export function ModuleShowcase() {
  return (
    <section id="compliance" style={{ background: 'var(--apas-deep)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-24"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4.5vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.1, marginBottom: '20px' }}>
            Every Module.{' '}
            <em style={{ color: 'var(--apas-sapphire)' }}>Built to Perform.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '580px', margin: '0 auto', lineHeight: 1.8 }}>
            Each capability designed with one goal: eliminate the chaos that costs you time, money, and peace of mind.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '120px' }}>
          {modules.map((mod) => (
            <ModuleSection key={mod.eyebrow} {...mod} />
          ))}
        </div>
      </div>
    </section>
  );
}
