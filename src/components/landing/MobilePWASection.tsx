import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function MobilePWASection() {
  return (
    <section style={{ background: 'var(--apas-midnight)', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
            className="flex justify-center"
          >
            <div
              style={{
                width: '240px',
                background: '#0A0C12',
                borderRadius: '40px',
                padding: '12px',
                border: '2px solid rgba(255,255,255,0.12)',
                boxShadow: '0 0 0 1px rgba(29,111,232,0.1), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                position: 'relative',
              }}
            >
              {/* Notch */}
              <div style={{ width: '80px', height: '22px', background: '#0A0C12', borderRadius: '0 0 14px 14px', margin: '0 auto 8px', position: 'relative', zIndex: 2, border: '1.5px solid rgba(255,255,255,0.1)', borderTop: 'none' }} />

              {/* Screen */}
              <div style={{ background: 'var(--apas-deep)', borderRadius: '28px', overflow: 'hidden', minHeight: '400px' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-white)' }}>9:41</span>
                  <span style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '9px', color: 'var(--apas-sapphire)' }}>APAS OS</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--apas-muted)' }}>●●● 100%</span>
                </div>

                {/* App header */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--apas-border)' }}>
                  <p style={{ fontFamily: 'DM Sans', fontWeight: 700, fontSize: '13px', color: 'var(--apas-white)' }}>Daily Grounds</p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#10B981' }}>In Progress · Parking Lot A</p>
                </div>

                {/* Voice indicator */}
                <div className="px-4 py-3">
                  <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span style={{ width: '6px', height: '6px', background: '#8B5CF6', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#8B5CF6' }}>Voice: Recording</span>
                    </div>
                    <div className="flex items-end gap-0.5" style={{ height: '16px' }}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} style={{ width: '3px', background: '#8B5CF6', borderRadius: '2px', animation: 'wave 1s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>

                  {['Parking Lot A ✓', 'Playground Equip ✓', 'Building Ext. — !'].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--apas-white)' }}>{item.replace(' ✓', '').replace(' — !', '')}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: item.includes('!') ? '#F43F5E' : '#10B981' }}>{item.includes('✓') ? '✓' : '!'}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--apas-sapphire)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(29,111,232,0.4)', fontSize: '24px' }}>
                      📷
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#10B981' }}>● Offline Mode ✓</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--apas-muted)' }}>2 items logged</span>
                  </div>
                </div>
              </div>

              {/* Home bar */}
              <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', margin: '10px auto 0' }} />
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--apas-sapphire)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Progressive Web App</div>
            <h2 style={{ fontFamily: 'Instrument Serif', fontSize: 'clamp(28px, 3.5vw, 44px)', color: 'var(--apas-white)', lineHeight: 1.2, marginBottom: '16px' }}>
              Your Job Site Is Your Office. Your Phone Is Your Platform.
            </h2>
            <p style={{ fontFamily: 'DM Sans', fontSize: '16px', color: 'var(--apas-muted)', lineHeight: 1.8, marginBottom: '28px' }}>
              Install directly from Safari or Chrome. Works on iPhone, Android, and any tablet. No software updates to manage — the platform updates itself.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                { icon: '📶', text: 'Works offline in the field — sync when you\'re back in range' },
                { icon: '📷', text: 'Full camera access for photo evidence with GPS tagging' },
                { icon: '🎤', text: 'Voice dictation for inspection notes without removing gloves' },
                { icon: '🔔', text: 'Push notifications for critical deadlines and approvals' },
                { icon: '⚡', text: 'Install in 10 seconds — Add to Home Screen from any browser' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                  <span style={{ fontFamily: 'DM Sans', fontSize: '15px', color: 'var(--apas-muted)', lineHeight: 1.6 }}>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/install"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px',
                  padding: '12px 20px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)', color: 'var(--apas-white)',
                  background: 'rgba(255,255,255,0.04)',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                How to Install on iPhone →
              </Link>
              <Link
                to="/install"
                style={{
                  fontFamily: 'DM Sans', fontWeight: 600, fontSize: '14px',
                  padding: '12px 20px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)', color: 'var(--apas-white)',
                  background: 'rgba(255,255,255,0.04)',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                How to Install on Android →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}</style>
    </section>
  );
}
