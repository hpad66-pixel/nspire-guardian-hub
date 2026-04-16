import { motion } from 'framer-motion';
import {
  ClipboardCheck, Shield, FileText, Wrench, Mic, BarChart3,
  Users, FolderKanban, Camera, BadgeCheck, GraduationCap,
  ShieldAlert, Truck, Share2, Mail, Building2, QrCode, Smartphone,
} from 'lucide-react';

const modules = [
  { icon: ClipboardCheck, label: 'Daily Inspections', color: '#10B981' },
  { icon: Shield, label: 'NSPIRE Compliance', color: '#3B82F6' },
  { icon: FileText, label: 'Permits & Licenses', color: '#8B5CF6' },
  { icon: Wrench, label: 'Work Orders', color: '#F59E0B' },
  { icon: FolderKanban, label: 'Project Management', color: '#6366F1' },
  { icon: Mic, label: 'AI Voice Agent', color: '#A855F7' },
  { icon: Camera, label: 'Photo Evidence', color: '#EC4899' },
  { icon: Users, label: 'Team & RBAC', color: '#3B82F6' },
  { icon: BarChart3, label: 'Reports & Analytics', color: '#06B6D4' },
  { icon: BadgeCheck, label: 'Credential Wallet', color: '#14B8A6' },
  { icon: GraduationCap, label: 'Training Academy', color: '#8B5CF6' },
  { icon: ShieldAlert, label: 'Safety Incidents', color: '#EF4444' },
  { icon: Truck, label: 'Equipment Tracker', color: '#F97316' },
  { icon: Share2, label: 'Client Portals', color: '#0EA5E9' },
  { icon: Mail, label: 'Messaging & Inbox', color: '#F43F5E' },
  { icon: Building2, label: 'Property Manager', color: '#64748B' },
  { icon: QrCode, label: 'QR Asset Scanning', color: '#84CC16' },
  { icon: Smartphone, label: 'PWA / Offline', color: '#22D3EE' },
];

export function HomePlatform() {
  return (
    <section id="platform" className="relative py-28 overflow-hidden" style={{ background: '#0A0B0D' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-blue-400/80 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>The Platform</p>
          <h2 className="text-white leading-tight mb-5" style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4.5vw, 48px)',
            letterSpacing: '-0.03em',
          }}>
            18 modules.{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">One platform.</span>
            <br />All connected.
          </h2>
          <p className="text-white/35 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px' }}>
            Every inspection creates issues. Every issue creates work orders. Every permit expiry triggers an alert. Every action leaves an audit trail.
          </p>
        </motion.div>

        {/* Module grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-4xl mx-auto mb-16">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.label}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              viewport={{ once: true }}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl cursor-default hover:bg-white/[0.04] transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `${mod.color}15`,
                  border: `1px solid ${mod.color}20`,
                  boxShadow: `0 0 0 0 ${mod.color}00`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${mod.color}25`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 0 ${mod.color}00`;
                }}
              >
                <mod.icon size={20} color={mod.color} />
              </div>
              <span className="text-[11px] font-medium text-white/40 text-center leading-tight group-hover:text-white/60 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                {mod.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Connection statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-4 px-7 py-3.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-[12px] text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Every action. Every decision. Every defect. — Timestamped & retrievable.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
