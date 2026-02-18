import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Mic, FileText, Camera, Zap, ShieldCheck, Bell, Calendar, ClipboardList, FolderKanban, Wrench, Users, BarChart3 } from 'lucide-react';

const F = ({ children }: { children: string }) => (
  <li className="flex items-start gap-2.5">
    <CheckCircle size={15} color="#059669" style={{ flexShrink: 0, marginTop: '3px' }} />
    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#475569', lineHeight: 1.65 }}>{children}</span>
  </li>
);

/* ── tiny mock cards ── */
function InspectionMock() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.07)', maxWidth: '340px' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#1E3A5F', marginBottom: '14px' }}>Daily Grounds Inspection</div>
      {[{ label: 'Parking Lot A', ok: true }, { label: 'Building Exterior', ok: true }, { label: 'Playground', ok: false }].map(item => (
        <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A' }}>{item.label}</span>
          {item.ok ? <CheckCircle size={15} color="#059669" /> : <AlertTriangle size={15} color="#DC2626" />}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
          {[8, 12, 6, 16, 10, 14, 8].map((h, i) => (
            <div key={i} style={{ width: '4px', height: `${h}px`, background: '#2563EB', borderRadius: '2px', animation: `altWave2 1.2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <style>{`@keyframes altWave2 { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1)} }`}</style>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>Voice note recording…</span>
        <div className="ml-auto" style={{ background: '#FFF5F5', color: '#DC2626', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>1 defect → WO Created</div>
      </div>
    </div>
  );
}

function PermitMock() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.07)', maxWidth: '340px' }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#1E3A5F' }}>Permit Dashboard</span>
        <span style={{ background: '#F0FDF4', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>0 violations</span>
      </div>
      {[
        { name: 'Fire Safety Certificate', days: '12d', color: '#D97706', bg: '#FFFBEB' },
        { name: 'Elevator Inspection', days: '45d', color: '#059669', bg: '#F0FDF4' },
        { name: 'Stormwater Permit', days: '90d', color: '#059669', bg: '#F0FDF4' },
      ].map(p => (
        <div key={p.name} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A' }}>{p.name}</span>
          <span style={{ background: p.bg, color: p.color, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace" }}>{p.days}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectMock() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.07)', maxWidth: '340px' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#1E3A5F', marginBottom: '4px' }}>Roof Replacement · Building C</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>60% complete</div>
      <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', marginBottom: '16px' }}>
        <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #2563EB, #7C3AED)', borderRadius: '3px' }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ label: 'Daily Reports', val: '12' }, { label: 'Open RFIs', val: '3' }, { label: 'Change Orders', val: '$45K' }].map(m => (
          <div key={m.label} style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '14px', color: '#1E3A5F' }}>{m.val}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '9px', color: '#94A3B8', marginTop: '2px' }}>{m.label}</div>
          </div>
        ))}
      </div>
      {[0.4, 0.7, 0.55].map((w, i) => (
        <div key={i} style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', marginBottom: '6px' }}>
          <div style={{ width: `${w * 100}%`, height: '100%', background: i === 0 ? '#2563EB' : i === 1 ? '#059669' : '#D97706', borderRadius: '3px' }} />
        </div>
      ))}
    </div>
  );
}

function VoiceMock() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)', borderRadius: '14px', padding: '24px', boxShadow: '0 8px 24px rgba(15,23,42,0.15)', maxWidth: '340px' }}>
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#86EFAC', animation: 'altPulse2 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes altPulse2 { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#E9D5FF' }}>AI Voice Agent · Live</span>
      </div>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '16px', height: '32px' }}>
        {[12, 20, 28, 16, 24, 18, 28, 14].map((h, i) => (
          <div key={i} style={{ width: '5px', height: `${h}px`, background: '#A78BFA', borderRadius: '3px', animation: `altWave3 1s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
        ))}
        <style>{`@keyframes altWave3 { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
        <div className="mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Tenant</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#E9D5FF', marginBottom: '10px' }}>"Leak under my kitchen sink, Unit 204B"</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>APAS AI</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#86EFAC' }}>"Got it. Ticket created, your team has been notified."</div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        {[{ label: 'Plumbing', c: '#A78BFA' }, { label: 'Medium', c: '#FCD34D' }, { label: 'Created ✓', c: '#86EFAC' }].map(b => (
          <span key={b.label} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', fontWeight: 600, color: b.c, background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px' }}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

function WorkOrderMock() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.07)', maxWidth: '340px' }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', color: '#1E3A5F', marginBottom: '14px' }}>Work Orders</div>
      {[
        { label: 'HVAC Unit B3', status: 'In Progress', priority: 'High', pColor: '#DC2626' },
        { label: 'Parking Light #7', status: 'Assigned', priority: 'Medium', pColor: '#D97706' },
        { label: 'Lobby Door Seal', status: 'Completed', priority: 'Low', pColor: '#059669' },
      ].map(wo => (
        <div key={wo.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: wo.pColor, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0F172A' }}>{wo.label}</span>
          </div>
          <span style={{ background: '#F8FAFC', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{wo.status}</span>
        </div>
      ))}
      <div style={{ marginTop: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#94A3B8' }}>Assigned to James · 10 min ago</div>
    </div>
  );
}

function TeamMock() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.07)', maxWidth: '340px' }}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[{ label: 'Compliance Rate', val: '94%', c: '#059669' }, { label: 'Inspections', val: '127', c: '#2563EB' }, { label: 'Work Orders', val: '48', c: '#D97706' }, { label: 'Avg Resolution', val: '2.3d', c: '#7C3AED' }].map(k => (
          <div key={k.label} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '20px', color: k.c }}>{k.val}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>
      {[{ name: 'Maria G.', role: 'Property Manager', color: '#2563EB' }, { name: 'James W.', role: 'Superintendent', color: '#059669' }, { name: 'David R.', role: 'Inspector', color: '#D97706' }].map(m => (
        <div key={m.name} className="flex items-center gap-3 py-2" style={{ borderTop: '1px solid #F1F5F9' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '12px', color: m.color }}>{m.name[0]}{m.name.split(' ')[1][0]}</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{m.name}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#94A3B8' }}>{m.role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

type Feature = {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  body: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip: boolean;
};

const features: Feature[] = [
  {
    eyebrow: 'Daily Operations',
    eyebrowColor: '#059669',
    title: 'Inspections that take 45 minutes, not 4 hours.',
    body: 'Walk your property with your phone. Speak your findings — the AI transcribes them. Take photos that are automatically GPS-tagged and timestamped. When you find a defect, a work order is created before you leave the room.',
    bullets: ['Voice dictation in English and Spanish', 'GPS + timestamped photo evidence', 'Automatic work order creation from defects', 'NSPIRE defect catalog built in (80+ items)', 'Supervisor review queue with one-tap approval', 'Printable PDF inspection report, auto-generated'],
    mockup: <InspectionMock />,
    flip: false,
  },
  {
    eyebrow: 'Compliance & Risk',
    eyebrowColor: '#2563EB',
    title: 'Never miss a regulatory deadline again.',
    body: 'Every permit, certificate, and regulatory filing has its own record in APAS OS. Expiration dates are tracked automatically. You get alerts at 90, 60, 30, and 14 days before anything expires.',
    bullets: ['Track every permit, certificate, and license in one dashboard', 'Automatic alerts before expiration — at 90, 60, 30, and 14 days', 'Deliverable tracking with due dates and responsible parties', 'Overdue items automatically generate issues', '3-year audit trail — everything is logged, timestamped, retrievable'],
    mockup: <PermitMock />,
    flip: true,
  },
  {
    eyebrow: 'Project Management',
    eyebrowColor: '#7C3AED',
    title: 'Capital projects. Total visibility. From bid to closeout.',
    body: 'APAS OS manages construction and renovation projects end to end. Milestones, daily site reports, formal RFI tracking, submittal logs, change order approvals, punch lists, safety logs, and final closeout documentation.',
    bullets: ['Gantt charts and milestone timeline views', 'Daily reports with photo documentation and voice dictation', 'Formal RFI workflow: create, number, assign, track, resolve', 'Change order approvals with budget tracking', 'Punch list with digital sign-off for closeout', 'AI-powered proposal generation for new scopes'],
    mockup: <ProjectMock />,
    flip: false,
  },
  {
    eyebrow: 'Signature AI Feature',
    eyebrowColor: '#7C3AED',
    title: 'Your 24/7 AI maintenance call center.',
    body: 'Tenants call at 2am. The AI answers — naturally, in their language. It captures the issue, verifies the unit, classifies the request, and creates a work order — all before your superintendent\'s phone rings.',
    bullets: ['Natural AI conversation handles maintenance requests 24/7', 'Emergency detection: "fire," "flood," "gas" trigger instant alerts', 'Auto-created work orders with full transcript and unit verification', 'Complete call recordings and audit trails', 'Tickets flow directly into the work order queue'],
    mockup: <VoiceMock />,
    flip: true,
  },
  {
    eyebrow: 'Maintenance',
    eyebrowColor: '#D97706',
    title: 'From defect to done. Nothing lost in between.',
    body: 'Every defect from an inspection, every tenant complaint from the AI call center, every issue flagged by a supervisor — all become tracked work orders automatically. Five-stage pipeline. Priority levels. Full activity log.',
    bullets: ['Auto-created from inspections, issues, and AI Voice Agent calls', '5-stage pipeline: Created → Assigned → In Progress → Pending Review → Completed', 'Priority levels with SLA awareness (Critical, High, Medium, Low)', 'Full activity log with timestamps and user attribution', 'Comment threads with @mentions'],
    mockup: <WorkOrderMock />,
    flip: false,
  },
  {
    eyebrow: 'Team & Analytics',
    eyebrowColor: '#0EA5E9',
    title: 'The right access for every role. The right data for every decision.',
    body: 'Nine role levels — from Owner to Subcontractor — each with precisely the access they need and nothing more. Property-specific assignments so your team only sees what they\'re responsible for.',
    bullets: ['9 role levels with property-specific access control', 'Row-level security enforced at the database — not just the UI', '9 built-in report types', 'CSV export for every data table', 'Training module with course player and digital certificate generation'],
    mockup: <TeamMock />,
    flip: true,
  },
];

export function AltFeatures() {
  return (
    <section id="projects" style={{ background: '#fff', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 46px)', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Every feature built around a real problem.
          </h2>
        </motion.div>

        <div className="flex flex-col gap-24">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-60px' }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${feat.flip ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* Copy */}
              <div className="flex-1">
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
                  fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: feat.eyebrowColor, display: 'block', marginBottom: '12px',
                }}>{feat.eyebrow}</span>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(22px, 3vw, 32px)', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '16px' }}>{feat.title}</h3>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', color: '#475569', lineHeight: 1.75, marginBottom: '24px' }}>{feat.body}</p>
                <ul className="flex flex-col gap-2">
                  {feat.bullets.map(b => <F key={b}>{b}</F>)}
                </ul>
              </div>
              {/* Mockup */}
              <div className="flex-1 flex justify-center">
                {feat.mockup}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
