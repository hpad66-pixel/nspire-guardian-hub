import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wifi, Camera, Mic, Bell, Smartphone } from 'lucide-react';

export function AltPWA() {
  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div style={{
              width: '240px',
              height: '480px',
              background: '#0F172A',
              borderRadius: '36px',
              padding: '12px',
              boxShadow: '0 32px 64px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
              position: 'relative',
              animation: 'altFloat 5s ease-in-out infinite',
            }}>
              <style>{`@keyframes altFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
              {/* Notch */}
              <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '80px', height: '6px', background: '#1E293B', borderRadius: '3px', zIndex: 10 }} />
              
              {/* Screen */}
              <div style={{ width: '100%', height: '100%', background: '#F8FAFC', borderRadius: '26px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-4 pt-5 pb-2" style={{ background: '#1E3A5F' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>9:41</span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '11px', color: '#fff' }}>APAS<span style={{ color: '#60A5FA' }}>OS</span></span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>●●●</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '11px', color: '#1E3A5F', marginBottom: '8px' }}>Daily Grounds · Parking Lot A</div>
                    {/* Waveform */}
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      {[6, 10, 14, 8, 12, 10, 14, 6, 10].map((h, i) => (
                        <div key={i} style={{ width: '4px', height: `${h}px`, background: '#2563EB', borderRadius: '2px', animation: `altWave4 1s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
                      ))}
                      <style>{`@keyframes altWave4 { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mic size={9} color="#2563EB" />
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '9px', color: '#2563EB', fontWeight: 600 }}>Voice: Recording…</span>
                    </div>
                  </div>

                  <div style={{ background: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>Items logged</div>
                    {['Parking Lot ✓', 'Entry Gate ✓'].map(item => (
                      <div key={item} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#059669', fontWeight: 600, marginBottom: '3px' }}>{item}</div>
                    ))}
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>Playground ⚠ 1 defect</div>
                  </div>

                  {/* Camera button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
                      <Camera size={22} color="#fff" />
                    </div>
                  </div>
                </div>

                {/* Offline badge */}
                <div className="flex items-center justify-center gap-1.5 py-2" style={{ background: '#ECFDF5', borderTop: '1px solid #D1FAE5' }}>
                  <Wifi size={10} color="#059669" />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', color: '#059669', fontWeight: 700 }}>Offline Mode Active ✓</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          >
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#2563EB', display: 'block', marginBottom: '12px' }}>Progressive Web App</span>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 3.5vw, 38px)', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '16px' }}>
              Works on every device.<br />No app store required.
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', color: '#475569', lineHeight: 1.75, marginBottom: '28px' }}>
              APAS OS is a Progressive Web App. Install it in 10 seconds from any browser on iPhone, Android, tablet, or desktop. Works offline when you're in the field — syncs when you're back in range. Camera, GPS, voice — all available. No app to update, no version mismatches.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {[
                { icon: Wifi, text: 'Works offline in the field — sync when you\'re back in range', color: '#059669' },
                { icon: Camera, text: 'Full camera access for photo evidence with GPS tagging', color: '#2563EB' },
                { icon: Mic, text: 'Voice dictation for inspection notes without removing gloves', color: '#7C3AED' },
                { icon: Bell, text: 'Push notifications for critical deadlines and approvals', color: '#D97706' },
                { icon: Smartphone, text: 'Install in 10 seconds — Add to Home Screen', color: '#DC2626' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3">
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={15} color={item.color} />
                  </div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', color: '#475569', lineHeight: 1.6, paddingTop: '6px' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/install" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px', color: '#2563EB', border: '1px solid #BFDBFE', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: '#EFF6FF' }}>
                📱 Install from Safari
              </Link>
              <Link to="/install" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px', color: '#2563EB', border: '1px solid #BFDBFE', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', background: '#EFF6FF' }}>
                🤖 Install from Chrome
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
