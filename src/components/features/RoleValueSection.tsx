import { motion } from 'framer-motion';
import { Building2, Briefcase, HardHat, ClipboardCheck, Wrench } from 'lucide-react';

const roles = [
  {
    icon: Building2,
    title: 'Property Owner',
    description: 'Complete visibility into operations without micromanaging. Know your property is protected.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    icon: Briefcase,
    title: 'Property Manager',
    description: 'One dashboard for everything. Stop juggling spreadsheets, emails, and paper forms.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: HardHat,
    title: 'Superintendent',
    description: "Assign, track, and verify work orders. Always know what's pending.",
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: ClipboardCheck,
    title: 'Inspector',
    description: 'Mobile-first inspections with voice dictation. No more clipboard paperwork.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Wrench,
    title: 'Subcontractor',
    description: 'Clear assignments, easy communication, training resources in one place.',
    color: 'from-rose-500 to-rose-600',
  },
];

export function RoleValueSection() {
  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Every Role
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From owners to inspectors, everyone gets exactly what they need—nothing more, nothing less.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {roles.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={index === 4 ? 'md:col-span-2 lg:col-span-1 lg:col-start-2' : ''}
            >
              <div className="h-full bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <role.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{role.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{role.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
