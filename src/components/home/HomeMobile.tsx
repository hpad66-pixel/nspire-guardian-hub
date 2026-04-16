import { motion } from 'framer-motion';
import { Wifi, Camera, Mic, Bell, Smartphone } from 'lucide-react';

const capabilities = [
  { icon: Wifi, text: 'Works offline — sync when back in range', color: '#10B981' },
  { icon: Camera, text: 'Full camera access with GPS tagging', color: '#3B82F6' },
  { icon: Mic, text: 'Voice dictation without removing gloves', color: '#8B5CF6' },
  { icon: Bell, text: 'Push notifications for critical deadlines', color: '#F59E0B' },
  { icon: Smartphone, text: 'Install in 10 seconds — Add to Home Screen', color: '#EF4444' },
];

export function HomeMobile() {
  return (
    <section className="py-28" style={{ background: '#FAFAF9' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div className="relative" style={{ animation: 'homeFloat 5s ease-in-out infinite' }}>
              <style>{`@keyframes homeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
              <div className="w-[220px] h-[440px] rounded-[32px] p-2.5" style={{ background: '#0A0B0D', boxShadow: '0 32px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)' }}>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/10 rounded-full z-10" />
                {/* Screen */}
                <div className="w-full h-full bg-[#FAFAF9] rounded-[24px] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-3 pt-5 pb-2" style={{ background: '#0A0B0D' }}>
                    <span className="text-[9px] text-white/60" style={{ fontFamily: "'JetBrains Mono'" }}>9:41</span>
                    <span className="text-[10px] font-bold text-white" style={{ fontFamily: 'Inter' }}>Build Space <span className="text-blue-400">OS</span></span>
                    <span className="text-[9px] text-white/60">●●●</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2.5">
                    <div className="bg-white rounded-lg p-2.5 border border-[#E4E4E7]">
                      <p className="text-[10px] font-semibold text-[#0A0B0D] mb-1.5" style={{ fontFamily: 'Inter' }}>Parking Lot A</p>
                      <div className="flex gap-[2px] items-end mb-1.5">
                        {[6, 10, 14, 8, 12, 10].map((h, i) => (
                          <div key={i} className="w-1 rounded-sm bg-blue-500" style={{ height: `${h}px`, animation: `wave 1.2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <style>{`@keyframes wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
                      <div className="flex items-center gap-1">
                        <Mic size={8} className="text-blue-500" />
                        <span className="text-[8px] text-blue-500 font-medium">Recording…</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-[#E4E4E7]">
                      <p className="text-[9px] text-[#A1A1AA] mb-1" style={{ fontFamily: 'Inter' }}>Items</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Parking ✓</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Entry Gate ✓</p>
                      <p className="text-[10px] text-red-500 font-medium">Playground ⚠</p>
                    </div>
                    <div className="flex justify-center mt-auto pt-2">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 border-t border-emerald-100">
                    <Wifi size={8} className="text-emerald-600" />
                    <span className="text-[9px] text-emerald-600 font-semibold">Offline Mode ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-blue-500/80 mb-4" style={{ fontFamily: 'Inter' }}>Progressive Web App</p>
            <h2 className="text-[#0A0B0D] mb-5 leading-snug" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 'clamp(24px, 3.5vw, 38px)', letterSpacing: '-0.02em' }}>
              Works on every device.<br />No app store required.
            </h2>
            <p className="text-[#71717A] mb-8 leading-relaxed" style={{ fontFamily: 'Inter', fontSize: '16px' }}>
              Install in 10 seconds from any browser. Works offline when you're in the field — syncs when you're back in range. Camera, GPS, voice — all available.
            </p>
            <div className="space-y-3">
              {capabilities.map(c => (
                <div key={c.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}12` }}>
                    <c.icon size={15} color={c.color} />
                  </div>
                  <span className="text-[14px] text-[#71717A]" style={{ fontFamily: 'Inter' }}>{c.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
