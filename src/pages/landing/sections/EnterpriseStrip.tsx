import { KeyRound, Users2, ShieldCheck, Database, ScrollText, Webhook, EyeOff } from 'lucide-react';
import { C, F, CONTAINER, Reveal } from '../shared';

const ITEMS = [
  { icon: KeyRound, label: 'SAML SSO' },
  { icon: Users2, label: 'SCIM provisioning' },
  { icon: ShieldCheck, label: 'Role-based permissions' },
  { icon: Database, label: 'Tenant isolation (RLS)' },
  { icon: ScrollText, label: 'Full audit log' },
  { icon: Webhook, label: 'API + webhooks' },
  { icon: EyeOff, label: 'Secrets hashed, shown once' },
];

export function EnterpriseStrip() {
  return (
    <section style={{ background: C.obsidian, padding: '54px 0', borderTop: `1px solid ${C.lineOnDark}` }}>
      <div style={CONTAINER}>
        <Reveal y={14}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'clamp(18px, 3.2vw, 40px)', flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold }}>
              Enterprise-ready
            </span>
            {ITEMS.map(({ icon: Icon, label }) => (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.dimOnDark,
              }}>
                <Icon size={14} color={C.faint} /> {label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
