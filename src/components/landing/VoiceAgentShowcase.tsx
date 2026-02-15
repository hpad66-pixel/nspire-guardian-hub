import { motion } from 'framer-motion';
import { Phone, Mic, Clock, AlertTriangle, FileText, Headphones, Zap, Shield } from 'lucide-react';

export function VoiceAgentShowcase() {
  return (
    <section id="voice-agent" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-500/5 to-background" />
      </div>

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 text-sm font-medium mb-6">
              <Phone className="h-4 w-4" />
              AI-Powered Innovation
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Your 24/7{' '}
              <span className="bg-gradient-to-r from-violet-500 to-violet-600 bg-clip-text text-transparent">
                AI Call Center.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Tenants call. The AI answers. Maintenance tickets get created automatically—with full 
              transcripts, emergency detection, and instant team notifications. No voicemail. No missed calls. No delays.
            </p>

            <div className="space-y-4">
              {[
                { icon: Headphones, text: 'Natural conversation AI that handles maintenance requests 24/7' },
                { icon: AlertTriangle, text: 'Emergency keyword detection triggers instant escalation alerts' },
                { icon: FileText, text: 'Auto-generated tickets with transcripts, unit verification, and categories' },
                { icon: Shield, text: 'Full call recordings and audit trails for supervisor oversight' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="text-muted-foreground">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-br from-violet-950 to-slate-900 rounded-3xl p-8 border border-violet-500/20 shadow-2xl shadow-violet-500/10">
              {/* Call Interface Mockup */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">AI Voice Agent</p>
                    <p className="text-violet-300 text-sm">Active • Listening</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 20, 8] }}
                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                      className="w-1 bg-violet-400 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Transcript */}
              <div className="space-y-4 mb-6">
                <div className="bg-white/5 rounded-2xl rounded-bl-md p-4">
                  <p className="text-violet-200 text-sm">"Hi, I'm calling about a leak in my kitchen sink. It's dripping pretty badly."</p>
                  <p className="text-violet-400 text-xs mt-2">Tenant • Unit 204B</p>
                </div>
                <div className="bg-violet-500/20 rounded-2xl rounded-br-md p-4 ml-8">
                  <p className="text-violet-100 text-sm">"I've logged a plumbing maintenance request for Unit 204B. A team member will contact you within 4 hours."</p>
                  <p className="text-violet-300 text-xs mt-2">AI Agent • Auto-response</p>
                </div>
              </div>

              {/* Auto-created ticket */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <p className="text-white text-sm font-medium">Ticket Auto-Created</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-violet-400">Category</p>
                    <p className="text-white">Plumbing</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-violet-400">Priority</p>
                    <p className="text-amber-400">Medium</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-violet-400">Unit</p>
                    <p className="text-white">204B ✓</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-violet-400">Status</p>
                    <p className="text-emerald-400">Created</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
