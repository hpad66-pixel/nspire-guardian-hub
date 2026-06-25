import { format } from 'date-fns';
import { RichTextViewer } from '@/components/ui/rich-text-editor';

export interface MeetingMinutesAttendee {
  name: string;
  role?: string | null;
  company?: string | null;
}

export interface PrintableMeetingMinutesProps {
  id: string;
  title: string;
  meetingType: string;
  meetingDate: string;
  meetingTime?: string | null;
  location?: string | null;
  status: string;
  attendees: MeetingMinutesAttendee[];
  /** Polished HTML minutes (preferred) or raw text. */
  body?: string | null;
  projectName: string;
  companyName?: string;
  logoUrl?: string | null;
  brandAddress?: string | null;
  brandPhone?: string | null;
  brandEmail?: string | null;
  brandWebsite?: string | null;
}

const INK = '#15233B';
const SAPPHIRE = '#1D6FE8';
const GOLD = '#C9A227';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';

function safeFormat(value: string | null | undefined, fmt: string, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(String(value).length === 10 ? value + 'T12:00:00' : value);
  if (isNaN(d.getTime())) return fallback;
  try { return format(d, fmt); } catch { return fallback; }
}

/** Treat content as HTML when it contains tags; otherwise render plain text with line breaks. */
function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

export function PrintableMeetingMinutes({
  title, meetingType, meetingDate, meetingTime, location, status, attendees, body,
  projectName, companyName = 'APAS Consulting', logoUrl,
  brandAddress, brandPhone, brandEmail, brandWebsite,
}: PrintableMeetingMinutesProps) {
  const contactBits = [brandAddress, brandPhone, brandEmail, brandWebsite].filter(Boolean).join('  ·  ');
  const minutes = (body ?? '').trim();

  return (
    <div className="meeting-minutes-doc" style={{ width: 760, background: '#FFFFFF', color: INK, fontFamily: 'Georgia, "Times New Roman", serif', padding: '0' }}>
      {/* Print pagination: keep sections, tables, and rows from splitting across
          pages, and never orphan a heading at the bottom of a page. */}
      <style>{`
        @media print {
          .meeting-minutes-doc table, .meeting-minutes-doc tr, .meeting-minutes-doc img,
          .meeting-minutes-doc ul, .meeting-minutes-doc ol, .meeting-minutes-doc li { break-inside: avoid; page-break-inside: avoid; }
          .meeting-minutes-doc h1, .meeting-minutes-doc h2, .meeting-minutes-doc h3 { break-after: avoid; page-break-after: avoid; break-inside: avoid; }
        }
      `}</style>
      {/* ── Branded letterhead ──────────────────────────────────────── */}
      <div style={{ borderTop: `6px solid ${GOLD}`, padding: '24px 40px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ height: 44, maxWidth: 160, objectFit: 'contain' }} />
            ) : null}
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>{companyName}</div>
              {contactBits && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{contactBits}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: SAPPHIRE, fontWeight: 700 }}>
              Meeting Minutes
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, textTransform: 'capitalize' }}>{status}</div>
          </div>
        </div>
        <div style={{ height: 2, background: SAPPHIRE, marginTop: 14 }} />
      </div>

      {/* ── Title + project ─────────────────────────────────────────── */}
      <div style={{ padding: '14px 40px 0' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: GOLD, fontWeight: 700 }}>
          {projectName}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 0', color: INK }}>{title}</h1>
      </div>

      {/* ── Meeting facts ───────────────────────────────────────────── */}
      <div style={{ padding: '14px 40px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <tbody>
            <tr>
              <td style={{ color: MUTED, padding: '4px 12px 4px 0', width: 90 }}>Date</td>
              <td style={{ padding: '4px 24px 4px 0', fontWeight: 600 }}>
                {safeFormat(meetingDate, 'PPP')}{meetingTime ? `  ·  ${meetingTime}` : ''}
              </td>
              <td style={{ color: MUTED, padding: '4px 12px 4px 0', width: 90 }}>Type</td>
              <td style={{ padding: '4px 0', fontWeight: 600, textTransform: 'capitalize' }}>{meetingType}</td>
            </tr>
            <tr>
              <td style={{ color: MUTED, padding: '4px 12px 4px 0' }}>Location</td>
              <td style={{ padding: '4px 24px 4px 0', fontWeight: 600 }}>{location || '—'}</td>
              <td style={{ color: MUTED, padding: '4px 12px 4px 0' }}>Attendees</td>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>{attendees.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Attendees ───────────────────────────────────────────────── */}
      {attendees.length > 0 && (
        <div style={{ padding: '16px 40px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: INK, marginBottom: 6 }}>Attendees</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F7F8FA' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${LINE}`, color: MUTED, fontWeight: 600 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${LINE}`, color: MUTED, fontWeight: 600 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${LINE}`, color: MUTED, fontWeight: 600 }}>Company</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${LINE}`, fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${LINE}` }}>{a.role || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: `1px solid ${LINE}` }}>{a.company || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Minutes body (renders HTML with proper formatting) ──────── */}
      <div style={{ padding: '18px 40px 32px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: INK, marginBottom: 8 }}>Minutes</div>
        {minutes ? (
          looksLikeHtml(minutes) ? (
            <div className="prose prose-sm max-w-none" style={{ color: INK, fontSize: 13, lineHeight: 1.65 }}>
              <RichTextViewer content={minutes} />
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.65 }}>{minutes}</div>
          )
        ) : (
          <div style={{ color: MUTED, fontStyle: 'italic' }}>No minutes recorded.</div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${LINE}`, padding: '12px 40px', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: MUTED }}>
        <span>{companyName} — Meeting Minutes</span>
        <span>Generated {format(new Date(), 'PP')}</span>
      </div>
    </div>
  );
}
