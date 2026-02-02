import { motion } from 'framer-motion';
import { AlertTriangle, Layers, Eye } from 'lucide-react';

const painPoints = [
  {
    icon: AlertTriangle,
    title: 'Compliance Risk',
    description: 'HUD inspections. Fire safety. Stormwater permits. One missed deadline can trigger enforcement actions that cost far more than prevention.',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    icon: Layers,
    title: 'Operational Chaos',
    description: 'Spreadsheets, emails, paper forms. When information lives in silos, critical issues fall through the cracks.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Eye,
    title: 'Invisible Maintenance',
    description: "Your team is working hard. But without visibility into daily operations, you can't catch problems before they become emergencies.",
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
];

export function PainPointsGrid() {
  return (
    <section id="pain-points" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Hidden Cost of{' '}
            <span className="text-muted-foreground">"Good Enough"</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Property management isn't just about collecting rent. It's about protecting a 
            multi-million dollar asset from risks that compound daily.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative h-full bg-card rounded-3xl p-8 border border-border shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className={`h-14 w-14 rounded-2xl ${point.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <point.icon className={`h-7 w-7 ${point.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
