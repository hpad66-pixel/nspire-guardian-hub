import { motion } from 'framer-motion';
import {
  Sun, ClipboardCheck, FolderKanban, Wrench, Shield, FileText, 
  Users, MessageCircle, Phone, BarChart3, GraduationCap, Building,
  Camera, Mic, AlertTriangle, Bell, Clock, FileCheck, Search, 
  Archive, Download, Lock, DoorOpen, Contact, Mail, Receipt, 
  Milestone, Flag, Hammer, GitBranch
} from 'lucide-react';

const featureCategories = [
  {
    category: 'Daily Operations',
    color: 'from-emerald-500 to-emerald-600',
    features: [
      { icon: Sun, title: 'Daily Grounds Inspections', description: 'Walk-the-property inspections with voice dictation, photo evidence, and auto-issue creation.' },
      { icon: Camera, title: 'Photo Documentation', description: 'Timestamped, GPS-tagged photos attached to every inspection item for undeniable proof.' },
      { icon: Mic, title: 'Voice Dictation', description: 'Speak your notes in English or Spanish—AI transcribes them into structured reports.' },
      { icon: ClipboardCheck, title: 'Supervisor Review Queue', description: 'One-tap approval workflow with reviewer notes and addendum support.' },
    ],
  },
  {
    category: 'Compliance & Risk',
    color: 'from-blue-500 to-blue-600',
    features: [
      { icon: Shield, title: 'NSPIRE Compliance Engine', description: '80+ defect catalog with severity-based repair deadlines. Always HUD-audit ready.' },
      { icon: FileCheck, title: 'Permit & Certificate Tracking', description: 'Expiration alerts, renewal workflows, and deliverable tracking for every permit.' },
      { icon: AlertTriangle, title: 'Issue Escalation Pipeline', description: 'Auto-generated issues from inspections flow to work orders with deadline enforcement.' },
      { icon: Clock, title: '3-Year Data Retention', description: 'Complete history for every inspection, work order, and communication—audit-proof.' },
    ],
  },
  {
    category: 'Project Management',
    color: 'from-violet-500 to-violet-600',
    features: [
      { icon: FolderKanban, title: 'Capital Project Tracking', description: 'Milestones, Gantt charts, daily reports, RFIs, submittals, and punch lists.' },
      { icon: Receipt, title: 'Budget & Change Orders', description: 'Track project financials with change order approval workflows and cost analysis.' },
      { icon: Milestone, title: 'Progress & Earned Value', description: 'CPI/SPI metrics, percent-complete tracking, and trade-level progress visualization.' },
      { icon: Hammer, title: 'Safety & Closeout', description: 'OSHA incident logs, toolbox talks, warranty tracking, and lessons learned.' },
    ],
  },
  {
    category: 'Maintenance & Work Orders',
    color: 'from-amber-500 to-amber-600',
    features: [
      { icon: Wrench, title: 'Work Order Pipeline', description: 'Five-stage lifecycle from creation to completion with full activity logging.' },
      { icon: Flag, title: 'Priority & SLA Tracking', description: 'Critical, high, medium, low—with configurable response time expectations.' },
      { icon: GitBranch, title: 'Auto-Creation from Issues', description: 'Defects from inspections automatically generate tracked work orders.' },
      { icon: Phone, title: 'AI Voice Agent Tickets', description: 'Maintenance requests from AI phone calls flow directly into the work order queue.' },
    ],
  },
  {
    category: 'Communications',
    color: 'from-pink-500 to-pink-600',
    features: [
      { icon: MessageCircle, title: 'Real-Time Team Messaging', description: 'Threaded conversations with @mentions, read receipts, and instant delivery.' },
      { icon: Mail, title: 'Email Integration', description: 'Send, receive, reply, and forward—complete email audit trail in one place.' },
      { icon: Bell, title: 'Smart Notifications', description: 'Real-time alerts for deadlines, assignments, approvals, and escalations.' },
      { icon: Phone, title: '24/7 AI Voice Agent', description: 'AI-powered call center for tenant maintenance requests with emergency detection.' },
    ],
  },
  {
    category: 'Organization & Reporting',
    color: 'from-cyan-500 to-cyan-600',
    features: [
      { icon: Users, title: 'Role-Based Access Control', description: 'Nine permission levels ensure everyone sees exactly what they need.' },
      { icon: BarChart3, title: 'Analytics Dashboard', description: 'Compliance rates, work order performance, inspection trends—all at a glance.' },
      { icon: GraduationCap, title: 'Training & Certification', description: 'Course management, progress tracking, and digital certificate generation.' },
      { icon: Download, title: 'Data Export & Reports', description: 'CSV exports, PDF reports, and printable inspection documents on demand.' },
    ],
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Every Feature.{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Built to Perform.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            24 enterprise-grade capabilities working together as one unified platform. 
            No more juggling tools. No more information silos. No more excuses.
          </p>
        </motion.div>

        <div className="space-y-16 max-w-7xl mx-auto">
          {featureCategories.map((cat, catIndex) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: catIndex * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${cat.color}`} />
                <h3 className="text-xl font-bold">{cat.category}</h3>
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
                  >
                    <div className="h-full bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-semibold mb-2 text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
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
