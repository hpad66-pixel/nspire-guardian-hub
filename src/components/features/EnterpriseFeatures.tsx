import { motion } from 'framer-motion';
import { 
  Lock, 
  FileSearch, 
  UserCog, 
  KeyRound, 
  HardDrive, 
  Bell, 
  Download, 
  Clock 
} from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Row-Level Security',
    description: 'Data isolation ensures users only see what they should.',
  },
  {
    icon: FileSearch,
    title: 'Complete Audit Trails',
    description: 'Every action is logged with timestamps and user IDs.',
  },
  {
    icon: UserCog,
    title: 'Role-Based Access',
    description: 'Nine permission levels from Admin to Viewer.',
  },
  {
    icon: KeyRound,
    title: 'Secure Authentication',
    description: 'Email verification and password protection.',
  },
  {
    icon: HardDrive,
    title: 'Secure Storage',
    description: 'Encrypted document and photo storage.',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Instant notifications for critical updates.',
  },
  {
    icon: Download,
    title: 'Data Export',
    description: 'CSV export for all tables and reports.',
  },
  {
    icon: Clock,
    title: 'Three-Year Retention',
    description: 'Complete history for audits and compliance.',
  },
];

export function EnterpriseFeatures() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Lock className="h-4 w-4" />
            Enterprise-Grade Security
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Peace of Mind
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Security and compliance aren't afterthoughts. They're built into every layer of the platform.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="h-full bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
