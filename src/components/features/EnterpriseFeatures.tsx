import { motion } from 'framer-motion';
import { Lock, FileSearch, UserCog, KeyRound, HardDrive, Bell, Download, Clock } from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Row-Level Security',
    description: 'Data isolation at the database level. Users see only what they\'re authorized to see — enforced by the database, not just the UI.',
    color: '#1D6FE8',
  },
  {
    icon: FileSearch,
    title: 'Complete Audit Trails',
    description: 'Every action — every login, update, upload, approval, and deletion — is logged with timestamp, user ID, and property context.',
    color: '#10B981',
  },
  {
    icon: UserCog,
    title: '9-Level Role Hierarchy',
    description: 'From Owner (full access) to Viewer (read-only). Every permission level maps to a real job function. No overprivileged access.',
    color: '#8B5CF6',
  },
  {
    icon: KeyRound,
    title: 'Secure Authentication',
    description: 'Email verification, password protection, and invitation-only onboarding. No unauthorized access. No exceptions.',
    color: '#F59E0B',
  },
  {
    icon: HardDrive,
    title: 'Encrypted Storage',
    description: 'All documents, photos, and inspection records stored with encryption in transit and at rest. Your compliance documentation is protected.',
    color: '#06B6D4',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Critical deadlines, overdue violations, emergency Voice Agent calls, and permit expirations trigger instant notifications.',
    color: '#F43F5E',
  },
  {
    icon: Clock,
    title: '3-Year Data Retention',
    description: 'HUD and NSPIRE compliance requires a history. APAS OS keeps all inspection records, work orders, and communications for 3 years — automatically.',
    color: '#10B981',
  },
  {
    icon: Download,
    title: 'CSV & PDF Export',
    description: 'Your data is yours. Export any table to CSV, any report to PDF, any inspection to a printable document. No vendor lock-in.',
    color: '#1D6FE8',
  },
];

export function EnterpriseFeatures() {
  return (
    <section style={{ background: 'var(--apas-deep)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{ background: 'rgba(29,111,232,0.12)', border: '1px solid rgba(29,111,232,0.25)', borderRadius: '999px', padding: '6px 16px' }}
          >
            <Lock size={13} color="var(--apas-sapphire)" />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--apas-sapphire)', letterSpacing: '0.04em' }}>Enterprise-Grade Security</span>
          </div>
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4.5vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.1, marginBottom: '20px' }}>
            Built-In Security.<br />
            <em style={{ color: 'var(--apas-muted)' }}>Right Out of the Box.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '580px', margin: '0 auto', lineHeight: 1.8 }}>
            Security and compliance aren't upsells. They're the foundation every plan is built on.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--apas-surface)',
                  border: '1px solid var(--apas-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${feature.color}35`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${feature.color}15`;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--apas-border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ height: '44px', width: '44px', borderRadius: '12px', background: `${feature.color}18`, border: `1px solid ${feature.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  <feature.icon size={20} color={feature.color} />
                </div>
                <h3 style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '15px', color: 'var(--apas-white)', marginBottom: '10px' }}>{feature.title}</h3>
                <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--apas-muted)', lineHeight: 1.75 }}>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
