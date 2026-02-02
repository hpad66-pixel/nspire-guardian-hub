import { motion } from 'framer-motion';
import { 
  Mic, 
  Camera, 
  AlertCircle, 
  CheckCircle2,
  Shield,
  Clock,
  Wrench,
  FileCheck,
  Calendar,
  Bell,
  FileText,
  FolderOpen,
  Search,
  History,
  Milestone,
  ClipboardList,
  Receipt,
  FileQuestion,
  Sparkles,
  Hammer,
  GitBranch,
  Flag,
  MessageSquare,
  Users,
  UserCog,
  GraduationCap,
  Send,
  BarChart3,
  PieChart,
  Download,
  MessageCircle,
  Zap,
  AtSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleProps {
  title: string;
  headline: string;
  description?: string;
  points: { icon: React.ElementType; text: string }[];
  visual: 'inspections' | 'compliance' | 'permits' | 'documents' | 'projects' | 'workorders' | 'team' | 'messaging' | 'analytics';
  reversed?: boolean;
}

function ModuleVisual({ type }: { type: ModuleProps['visual'] }) {
  const visuals: Record<ModuleProps['visual'], React.ReactNode> = {
    inspections: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-medium">Daily Grounds Inspection</p>
            <p className="text-xs text-muted-foreground">Today, 8:42 AM</p>
          </div>
        </div>
        <div className="space-y-3">
          {['Parking Lot A', 'Playground Equipment', 'Building Exterior'].map((item, i) => (
            <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <CheckCircle2 className={cn("h-5 w-5", i < 2 ? "text-emerald-500" : "text-muted-foreground")} />
              <span className="text-sm">{item}</span>
              {i < 2 && <Camera className="h-4 w-4 text-muted-foreground ml-auto" />}
            </div>
          ))}
        </div>
      </div>
    ),
    compliance: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">NSPIRE Status</h4>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium">Compliant</span>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Outside Areas', status: 'clear', items: 0 },
            { label: 'Inside Common', status: 'clear', items: 0 },
            { label: 'Unit Inspections', status: 'attention', items: 2 },
          ].map((area) => (
            <div key={area.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  area.status === 'clear' ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <span className="text-sm">{area.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {area.items > 0 ? `${area.items} items` : 'All clear'}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    permits: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Permit Calendar</h4>
          <span className="text-sm text-muted-foreground">February 2026</span>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Fire Safety Certificate', days: 12, status: 'warning' },
            { name: 'Elevator Inspection', days: 45, status: 'ok' },
            { name: 'Stormwater Permit', days: 90, status: 'ok' },
          ].map((permit) => (
            <div key={permit.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <FileCheck className={cn(
                  "h-5 w-5",
                  permit.status === 'warning' ? "text-amber-500" : "text-muted-foreground"
                )} />
                <span className="text-sm">{permit.name}</span>
              </div>
              <span className={cn(
                "text-sm",
                permit.status === 'warning' ? "text-amber-500" : "text-muted-foreground"
              )}>
                {permit.days}d
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    documents: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="bg-transparent text-sm outline-none flex-1"
            readOnly
          />
        </div>
        <div className="space-y-2">
          {[
            { name: 'Contracts', icon: FolderOpen, count: 12 },
            { name: 'Insurance', icon: Shield, count: 4 },
            { name: 'Policies', icon: FileText, count: 8 },
            { name: 'Legal', icon: FileCheck, count: 6 },
          ].map((folder) => (
            <div key={folder.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <folder.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{folder.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{folder.count} files</span>
            </div>
          ))}
        </div>
      </div>
    ),
    projects: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Roof Replacement</h4>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">Active</span>
        </div>
        <div className="space-y-4">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-3/5 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">60%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">12</p>
              <p className="text-xs text-muted-foreground">Daily Reports</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">3</p>
              <p className="text-xs text-muted-foreground">Open RFIs</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">$45K</p>
              <p className="text-xs text-muted-foreground">Change Orders</p>
            </div>
          </div>
        </div>
      </div>
    ),
    workorders: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Work Orders</h4>
          <span className="text-sm text-muted-foreground">This Week</span>
        </div>
        <div className="space-y-3">
          {[
            { title: 'HVAC Unit B3', status: 'In Progress', priority: 'high' },
            { title: 'Parking Light #7', status: 'Assigned', priority: 'medium' },
            { title: 'Lobby Door Seal', status: 'Completed', priority: 'low' },
          ].map((wo) => (
            <div key={wo.title} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  wo.priority === 'high' ? "bg-rose-500" :
                  wo.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <div>
                  <p className="text-sm font-medium">{wo.title}</p>
                  <p className="text-xs text-muted-foreground">{wo.status}</p>
                </div>
              </div>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    ),
    team: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Team Members</h4>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium">8 Active</span>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Maria Garcia', role: 'Property Manager', avatar: 'MG' },
            { name: 'James Wilson', role: 'Superintendent', avatar: 'JW' },
            { name: 'Lisa Chen', role: 'Inspector', avatar: 'LC' },
          ].map((member) => (
            <div key={member.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-medium">
                {member.avatar}
              </div>
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    messaging: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Team Messages</h4>
          <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">3</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-2xl rounded-bl-md bg-muted/50">
            <p className="text-sm">Inspection complete for Building A. All clear! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">Maria • 2m ago</p>
          </div>
          <div className="p-3 rounded-2xl rounded-br-md bg-primary/10 ml-8">
            <p className="text-sm">Great work! Moving to Building B now.</p>
            <p className="text-xs text-muted-foreground mt-1">You • Just now</p>
          </div>
        </div>
      </div>
    ),
    analytics: (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold">Monthly Overview</h4>
          <span className="text-sm text-muted-foreground">February 2026</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10">
            <PieChart className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-2xl font-bold">94%</p>
            <p className="text-xs text-muted-foreground">Compliance Rate</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">127</p>
            <p className="text-xs text-muted-foreground">Inspections</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10">
            <Wrench className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-2xl font-bold">48</p>
            <p className="text-xs text-muted-foreground">Work Orders</p>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/10">
            <Clock className="h-5 w-5 text-violet-500 mb-2" />
            <p className="text-2xl font-bold">2.3d</p>
            <p className="text-xs text-muted-foreground">Avg Resolution</p>
          </div>
        </div>
      </div>
    ),
  };

  return visuals[type];
}

function ModuleSection({ title, headline, description, points, visual, reversed }: ModuleProps) {
  return (
    <div className={cn(
      "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center",
      reversed && "lg:flex-row-reverse"
    )}>
      <motion.div
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className={cn(reversed && "lg:order-2")}
      >
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          {title}
        </span>
        <h3 className="text-3xl md:text-4xl font-bold mb-4">{headline}</h3>
        {description && (
          <p className="text-lg text-muted-foreground mb-6">{description}</p>
        )}
        <div className="space-y-4">
          {points.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <point.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-muted-foreground">{point.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reversed ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className={cn(reversed && "lg:order-1")}
      >
        <ModuleVisual type={visual} />
      </motion.div>
    </div>
  );
}

const modules: ModuleProps[] = [
  {
    title: 'Daily Inspections',
    headline: 'Every Corner. Every Day. Documented.',
    points: [
      { icon: Mic, text: 'Voice-powered inspections with automatic Spanish translation' },
      { icon: Camera, text: 'Photo evidence with timestamps and GPS location' },
      { icon: AlertCircle, text: 'Automatic issue creation when defects are found' },
      { icon: CheckCircle2, text: 'Supervisor review queue with one-tap approval' },
    ],
    visual: 'inspections',
  },
  {
    title: 'NSPIRE Compliance',
    headline: 'HUD-Ready. Always.',
    points: [
      { icon: Shield, text: 'Complete NSPIRE defect catalog built-in' },
      { icon: Clock, text: 'Severity-based repair deadlines (24h / 30d / 60d)' },
      { icon: Wrench, text: 'Automatic work order generation for defects' },
      { icon: History, text: 'Three-year audit trail retention for inspections' },
    ],
    visual: 'compliance',
    reversed: true,
  },
  {
    title: 'Permit Center',
    headline: 'Never Miss a Deadline Again.',
    points: [
      { icon: FileCheck, text: 'Track every permit, certificate, and regulatory filing' },
      { icon: Bell, text: 'Automated deliverable reminders before due dates' },
      { icon: Calendar, text: 'Expiration tracking for all documents' },
      { icon: AlertCircle, text: 'Overdue items automatically trigger issues' },
    ],
    visual: 'permits',
  },
  {
    title: 'Document Center',
    headline: 'Your Digital Filing Cabinet.',
    points: [
      { icon: FolderOpen, text: 'Organized by category: Contracts, Insurance, Legal, Policies' },
      { icon: History, text: 'Version history on every document' },
      { icon: Calendar, text: 'Expiration date tracking for contracts & insurance' },
      { icon: Search, text: 'Instant search across all files' },
    ],
    visual: 'documents',
    reversed: true,
  },
  {
    title: 'Project Management',
    headline: 'Capital Projects. Complete Visibility.',
    points: [
      { icon: Milestone, text: 'Milestone tracking with visual timeline view' },
      { icon: ClipboardList, text: 'Daily reports with photo documentation' },
      { icon: Receipt, text: 'Change order approval workflows' },
      { icon: FileQuestion, text: 'RFI tracking and punch lists' },
      { icon: Sparkles, text: 'AI-powered proposal generation' },
    ],
    visual: 'projects',
  },
  {
    title: 'Work Orders',
    headline: 'From Issue to Resolution. Tracked.',
    points: [
      { icon: Hammer, text: 'Automatic creation from inspections and issues' },
      { icon: GitBranch, text: 'Five-stage status pipeline for clear tracking' },
      { icon: Flag, text: 'Priority levels with SLA awareness' },
      { icon: MessageSquare, text: 'Full activity log and comment threads' },
    ],
    visual: 'workorders',
    reversed: true,
  },
  {
    title: 'Team Management',
    headline: 'The Right Access. For Every Role.',
    points: [
      { icon: Users, text: 'Nine role levels from Admin to Viewer' },
      { icon: UserCog, text: 'Property-specific assignments for team members' },
      { icon: GraduationCap, text: 'Training tracking with certificates' },
      { icon: Send, text: 'Invitation system for contractors and vendors' },
    ],
    visual: 'team',
  },
  {
    title: 'Real-Time Messaging',
    headline: 'Your Team. In Sync.',
    points: [
      { icon: MessageCircle, text: 'iMessage-style threaded conversations' },
      { icon: Zap, text: 'Real-time message delivery with presence' },
      { icon: AtSign, text: '@mentions and instant notifications' },
      { icon: History, text: 'Full message history with search' },
    ],
    visual: 'messaging',
    reversed: true,
  },
  {
    title: 'Analytics & Reporting',
    headline: 'Decisions Backed by Data.',
    points: [
      { icon: PieChart, text: 'Property portfolio analytics at a glance' },
      { icon: BarChart3, text: 'Inspection summary and compliance reports' },
      { icon: Wrench, text: 'Work order performance metrics' },
      { icon: Download, text: 'CSV export for all data' },
    ],
    visual: 'analytics',
  },
];

export function ModuleShowcase() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Every Module.{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Built to Perform.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Each capability designed with one goal: eliminate the chaos that costs you time, money, and peace of mind.
          </p>
        </motion.div>

        <div className="space-y-24 md:space-y-32">
          {modules.map((module, index) => (
            <ModuleSection key={module.title} {...module} />
          ))}
        </div>
      </div>
    </section>
  );
}
