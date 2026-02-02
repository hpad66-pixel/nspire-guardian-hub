import { motion } from 'framer-motion';
import { 
  ClipboardCheck, 
  Shield, 
  FileText, 
  Wrench, 
  MessageSquare, 
  BarChart3,
  ArrowRight
} from 'lucide-react';

const modules = [
  { icon: ClipboardCheck, label: 'Inspections', color: 'from-emerald-500 to-emerald-600' },
  { icon: Shield, label: 'Compliance', color: 'from-blue-500 to-blue-600' },
  { icon: FileText, label: 'Permits', color: 'from-violet-500 to-violet-600' },
  { icon: Wrench, label: 'Work Orders', color: 'from-amber-500 to-amber-600' },
  { icon: MessageSquare, label: 'Messaging', color: 'from-pink-500 to-pink-600' },
  { icon: BarChart3, label: 'Analytics', color: 'from-cyan-500 to-cyan-600' },
];

export function PlatformOverview() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything.{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Connected.
            </span>{' '}
            Accountable.
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A unified property operations platform where every inspection, every work order, 
            every permit, and every message lives in one place—with complete audit trails.
          </p>
        </motion.div>

        {/* Animated Module Flow */}
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection Lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {modules.map((module, index) => (
                <motion.div
                  key={module.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg transition-all duration-300 text-center group-hover:-translate-y-2">
                    <div className={`h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <module.icon className="h-7 w-7 text-white" />
                    </div>
                    <p className="font-medium text-sm">{module.label}</p>
                  </div>
                  
                  {/* Arrow connector (hidden on last item) */}
                  {index < modules.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden lg:block">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Central Hub Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-4 bg-card/80 backdrop-blur-xl rounded-full px-8 py-4 border border-border shadow-xl">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Single Source of Truth</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Complete Audit Trail</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Real-Time Updates</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
