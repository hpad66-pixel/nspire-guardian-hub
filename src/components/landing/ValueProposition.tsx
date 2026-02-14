import { motion } from 'framer-motion';
import { DollarSign, Clock, ShieldAlert, FileWarning, TrendingDown, Scale } from 'lucide-react';

const stats = [
  {
    icon: DollarSign,
    value: '$50K+',
    label: 'Average cost of a single HUD non-compliance finding',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    icon: Clock,
    value: '40hrs',
    label: 'Wasted per month on manual tracking & paper processes',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: ShieldAlert,
    value: '3x',
    label: 'More likely to face enforcement without digital audit trails',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

const painPoints = [
  {
    icon: FileWarning,
    title: 'Compliance Exposure',
    description: 'HUD inspections, fire safety certificates, stormwater permits—one missed deadline triggers enforcement actions that cost far more than prevention ever would.',
  },
  {
    icon: TrendingDown,
    title: 'Operational Blind Spots',
    description: 'Spreadsheets, emails, paper forms, filing cabinets. When information is fragmented, critical issues slip through the cracks until they become emergencies.',
  },
  {
    icon: Scale,
    title: 'Zero Accountability',
    description: 'Without timestamped records, photo evidence, and clear audit trails—you can\'t prove who did what, when, or whether it was done correctly.',
  },
];

export function ValueProposition() {
  return (
    <section id="pain-points" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Cost Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            The Hidden Cost of{' '}
            <span className="text-muted-foreground">"Good Enough"</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Property management isn't just about collecting rent. It's about protecting a 
            multi-million dollar asset from risks that compound daily.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center bg-card rounded-2xl p-8 border border-border shadow-sm"
            >
              <div className={`h-14 w-14 rounded-2xl ${stat.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <p className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Pain Points */}
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
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <point.icon className="h-7 w-7 text-primary" />
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
