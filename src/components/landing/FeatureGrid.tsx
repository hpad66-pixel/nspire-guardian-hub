import { motion } from 'framer-motion';
import {
  Sun, ClipboardCheck, FolderKanban, Wrench, Shield, FileText,
  Users, MessageCircle, Phone, BarChart3, GraduationCap,
  Camera, Mic, AlertTriangle, Bell, Clock, FileCheck, Search,
  Archive, Download, Lock, Mail, Receipt, Milestone, Flag, Hammer, GitBranch
} from 'lucide-react';

const featureCategories = [
  {
    category: 'Daily Operations', color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)',
    features: [
      { icon: Sun, title: 'Daily Grounds Inspections', description: 'Walk-the-property inspections with voice dictation, photo evidence, and auto-issue creation.' },
      { icon: Camera, title: 'Photo Documentation', description: 'Timestamped, GPS-tagged photos attached to every inspection item for undeniable proof.' },
      { icon: Mic, title: 'Voice Dictation', description: 'Speak your notes in English or Spanish — AI transcribes them into structured reports.' },
      { icon: ClipboardCheck, title: 'Supervisor Review Queue', description: 'One-tap approval workflow with reviewer notes and addendum support.' },
    ],
  },
  {
    category: 'Compliance & Risk', color: '#1D6FE8', gradient: 'linear-gradient(135deg, #1D6FE8, #1558C0)',
    features: [
      { icon: Shield, title: 'NSPIRE Compliance Engine', description: '80+ defect catalog with severity-based repair deadlines. Always HUD-audit ready.' },
      { icon: FileCheck, title: 'Permit & Certificate Tracking', description: 'Expiration alerts, renewal workflows, and deliverable tracking for every permit.' },
      { icon: AlertTriangle, title: 'Issue Escalation Pipeline', description: 'Auto-generated issues from inspections flow to work orders with deadline enforcement.' },
      { icon: Clock, title: '3-Year Data Retention', description: 'Complete history for every inspection, work order, and communication — audit-proof.' },
    ],
  },
  {
    category: 'Project Management', color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    features: [
      { icon: FolderKanban, title: 'Capital Project Tracking', description: 'Milestones, Gantt charts, daily reports, RFIs, submittals, and punch lists.' },
      { icon: Receipt, title: 'Budget & Change Orders', description: 'Track project financials with change order approval workflows and cost analysis.' },
      { icon: Milestone, title: 'Progress & Earned Value', description: 'CPI/SPI metrics, percent-complete tracking, and trade-level progress visualization.' },
      { icon: Hammer, title: 'Safety & Closeout', description: 'OSHA incident logs, toolbox talks, warranty tracking, and lessons learned.' },
    ],
  },
  {
    category: 'Maintenance & Work Orders', color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    features: [
      { icon: Wrench, title: 'Work Order Pipeline', description: 'Five-stage lifecycle from creation to completion with full activity logging.' },
      { icon: Flag, title: 'Priority & SLA Tracking', description: 'Critical, high, medium, low — with configurable response time expectations.' },
      { icon: GitBranch, title: 'Auto-Creation from Issues', description: 'Defects from inspections automatically generate tracked work orders.' },
      { icon: Phone, title: 'AI Voice Agent Tickets', description: 'Maintenance requests from AI phone calls flow directly into the work order queue.' },
    ],
  },
  {
    category: 'Communications', color: '#F43F5E', gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)',
    features: [
      { icon: MessageCircle, title: 'Real-Time Team Messaging', description: 'Threaded conversations with @mentions, read receipts, and instant delivery.' },
      { icon: Mail, title: 'Email Integration', description: 'Send, receive, reply, and forward — complete email audit trail in one place.' },
      { icon: Bell, title: 'Smart Notifications', description: 'Real-time alerts for deadlines, assignments, approvals, and escalations.' },
      { icon: Phone, title: '24/7 AI Voice Agent', description: 'AI-powered call center for tenant maintenance requests with emergency detection.' },
    ],
  },
  {
    category: 'Organization & Reporting', color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)',
    features: [
      { icon: Users, title: 'Role-Based Access Control', description: 'Nine permission levels ensure everyone sees exactly what they need.' },
      { icon: BarChart3, title: 'Analytics Dashboard', description: 'Compliance rates, work order performance, inspection trends — all at a glance.' },
      { icon: GraduationCap, title: 'Training & Certification', description: 'Course management, progress tracking, and digital certificate generation.' },
      { icon: Download, title: 'Data Export & Reports', description: 'CSV exports, PDF reports, and printable inspection documents on demand.' },
    ],
  },
];

export function FeatureGrid() {
  return (
    <section id="features" style={{ background: 'var(--apas-deep)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-20"
        >
          <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--apas-white)', lineHeight: 1.15, marginBottom: '16px' }}>
            24 Enterprise-Grade Capabilities.{' '}
            <em>One Monthly Subscription.</em>
          </h2>
          <p style={{ fontFamily: 'DM Sans', fontSize: '18px', color: 'var(--apas-muted)', maxWidth: '640px', margin: '0 auto' }}>
            No more juggling tools. No more information silos. No more excuses.
          </p>
        </motion.div>

        <div className="space-y-16">
          {featureCategories.map((cat, catIndex) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: catIndex * 0.04, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-60px' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div style={{ height: '3px', width: '40px', borderRadius: '999px', background: cat.gradient }} />
                <h3 style={{ fontFamily: 'DM Sans', fontSize: '16px', fontWeight: 700, color: 'var(--apas-white)', letterSpacing: '-0.01em' }}>{cat.category}</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cat.features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="group"
                    style={{
                      background: 'var(--apas-surface)',
                      borderRadius: '14px',
                      padding: '22px',
                      border: '1px solid var(--apas-border)',
                      transition: 'all 0.25s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = `${cat.color}40`;
                      el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${cat.color}20`;
                      el.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = 'var(--apas-border)';
                      el.style.boxShadow = 'none';
                      el.style.transform = 'translateY(0)';
                    }}
                  >
                    <div
                      style={{ height: '40px', width: '40px', borderRadius: '10px', background: cat.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: `0 4px 12px ${cat.color}30` }}
                    >
                      <feature.icon size={18} color="white" />
                    </div>
                    <h4 style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px', color: 'var(--apas-white)', marginBottom: '8px', lineHeight: 1.3 }}>{feature.title}</h4>
                    <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--apas-muted)', lineHeight: 1.7 }}>{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
