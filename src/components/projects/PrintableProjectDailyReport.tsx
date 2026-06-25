import { format } from 'date-fns';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import { DailyReviewSeal } from './DailyReviewSeal';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

export interface PrintableProjectDailyReportProps {
  report: DailyReportRow;
  projectName: string;
  propertyName?: string;
  propertyAddress?: string;
  projectType?: string;
  inspectorName?: string;
  companyName?: string;
}

/** Never throw on a null/invalid date — imported rows often have missing dates. */
function safeFormat(value: string | null | undefined, fmt: string, fallback = '—'): string {
  if (!value) return fallback;
  const d = new Date(String(value).length === 10 ? value + 'T12:00:00' : value);
  if (isNaN(d.getTime())) return fallback;
  try { return format(d, fmt); } catch { return fallback; }
}

/** Coerce arrays / JSON strings / scalars into a clean array. */
function asArray<T = any>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    try { const p = JSON.parse(s); return Array.isArray(p) ? p : [p]; }
    catch { return s.split(',').map(x => x.trim()).filter(Boolean) as unknown as T[]; }
  }
  if (v == null) return [];
  return [v as T];
}

const INK = '#15233B';
const SAPPHIRE = '#1D6FE8';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';

export function PrintableProjectDailyReport({
  report, projectName, propertyName, propertyAddress, projectType, inspectorName,
  companyName = 'APAS Consulting',
}: PrintableProjectDailyReportProps) {
  const subcontractors = asArray(report.subcontractors);
  const visitorLog = asArray(report.visitor_log);
  const equipment = asArray<string>(report.equipment_used);
  const pdfPath = (report as any).pdf_path as string | null | undefined;
  const signature = (report as any).signature as string | null | undefined;
  const photos = asArray<string>(report.photos);
  const photoMeta = asArray<{ url: string; caption?: string }>((report as any).photos_meta);

  // Full Procore payload (weather observations, manpower breakdown, inspector…)
  const pc: any = (report as any).procore_data || {};
  const inspector = inspectorName || (report as any).submitted_by_name || pc.inspector || undefined;
  const weatherObs: any[] = Array.isArray(pc.weather_observations) ? pc.weather_observations : [];
  const manpower = pc.manpower || {};
  const crews: any[] = Array.isArray(manpower.crews) ? manpower.crews : [];
  const photoNames: string[] = Array.isArray(pc.photo_filenames) ? pc.photo_filenames : [];
  const totalHours = pc.total_hours ?? manpower.total_hours;

  // work_performed from the importer is "Title — comment" blocks separated by blank lines
  const noteBlocks = (report.work_performed || '')
    .split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
    .map(b => {
      const idx = b.indexOf(' — ');
      return idx > -1 ? { title: b.slice(0, idx), body: b.slice(idx + 3) } : { title: '', body: b };
    });

  const Section = ({ title, accent = INK, children }: { title: string; accent?: string; children: React.ReactNode }) => (
    <div style={{ marginTop: 18, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 4, height: 16, background: accent, borderRadius: 2 }} />
        <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK }}>{title}</div>
      </div>
      {children}
    </div>
  );

  const Callout = ({ text, bg, border, color }: { text: string; bg: string; border: string; color: string }) => (
    <div style={{ padding: '10px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, color, whiteSpace: 'pre-wrap' }}>{text}</div>
  );

  return (
    <div
      id="printable-project-daily-report"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif', background: 'white', color: INK, padding: 36, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}
    >
      {/* Brand bar */}
      <div style={{ height: 5, background: SAPPHIRE, borderRadius: 3, marginBottom: 18 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>{companyName}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: SAPPHIRE, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>
            Daily Field Inspection Report
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{safeFormat(report.report_date, 'EEEE, MMMM d, yyyy')}</div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>Report #{report.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: LINE, border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
        {[
          { label: 'Project', value: projectName },
          { label: 'Property', value: propertyName || '—' },
          { label: 'Inspector', value: inspector || '—' },
          { label: 'Workers on Site', value: String(report.workers_count ?? 0) },
          { label: 'Total Hours', value: totalHours != null ? String(totalHours) : '—' },
          { label: 'Weather', value: report.weather || (weatherObs.length ? `${weatherObs.length} obs.` : 'Not recorded') },
          { label: 'Photos', value: String(photoMeta.length || photos.length || photoNames.length) },
          { label: 'Type', value: projectType || '—' },
        ].map((it) => (
          <div key={it.label} style={{ background: 'white', padding: '9px 11px' }}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'system-ui' }}>{it.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{it.value}</div>
          </div>
        ))}
      </div>
      {propertyAddress && <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{propertyAddress}</div>}

      {/* Weather Observations */}
      {weatherObs.length > 0 && (
        <Section title="Observed Weather Conditions">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'system-ui' }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {['#', 'Time', 'Conditions', 'Delay', 'Comments'].map(h => (
                  <th key={h} style={{ padding: '6px 9px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weatherObs.map((w: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid #F3F4F6` }}>
                  <td style={{ padding: '6px 9px' }}>{i + 1}</td>
                  <td style={{ padding: '6px 9px' }}>{w.time || '—'}</td>
                  <td style={{ padding: '6px 9px' }}>{w.conditions || '—'}</td>
                  <td style={{ padding: '6px 9px', color: w.delay === 'Yes' ? '#B91C1C' : INK }}>{w.delay || 'No'}</td>
                  <td style={{ padding: '6px 9px' }}>{w.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Manpower */}
      {(crews.length > 0 || manpower.workers) && (
        <Section title="Manpower">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'system-ui' }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {['Crew / Company', 'Workers', 'Hrs Each', 'Total Hours'].map(h => (
                  <th key={h} style={{ padding: '6px 9px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(crews.length ? crews : [{ company: null, workers: manpower.workers, hours_each: null, total_hours: manpower.total_hours }]).map((c: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid #F3F4F6` }}>
                  <td style={{ padding: '6px 9px' }}>{c.company || 'Crew'}</td>
                  <td style={{ padding: '6px 9px' }}>{c.workers ?? '—'}</td>
                  <td style={{ padding: '6px 9px' }}>{c.hours_each ?? '—'}</td>
                  <td style={{ padding: '6px 9px' }}>{c.total_hours ?? '—'}</td>
                </tr>
              ))}
              <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                <td style={{ padding: '6px 9px' }}>Total</td>
                <td style={{ padding: '6px 9px' }}>{manpower.workers ?? report.workers_count ?? '—'}</td>
                <td style={{ padding: '6px 9px' }} />
                <td style={{ padding: '6px 9px' }}>{totalHours ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          {manpower.created_by && <div style={{ fontSize: 11, color: MUTED, marginTop: 4, fontFamily: 'system-ui' }}>Logged by {manpower.created_by}</div>}
        </Section>
      )}

      {/* Work Performed */}
      <Section title="Work Performed" accent={SAPPHIRE}>
        {report.work_performed_html ? (
          <div style={{ padding: '8px 12px', background: '#F9FAFB', border: `1px solid ${LINE}`, borderRadius: 8 }}>
            <RichTextViewer content={report.work_performed_html} />
          </div>
        ) : noteBlocks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {noteBlocks.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#F9FAFB', border: `1px solid ${LINE}`, borderRadius: 8, breakInside: 'avoid' }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: 11, background: SAPPHIRE, color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>{i + 1}</div>
                <div>
                  {n.title && <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>}
                  {n.body && <div style={{ fontSize: 13, color: '#374151', marginTop: n.title ? 2 : 0 }}>{n.body}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No work description recorded.</div>
        )}
      </Section>

      {/* Equipment */}
      {equipment.length > 0 && (
        <Section title="Equipment on Site">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {equipment.map((item, i) => (
              <span key={i} style={{ padding: '4px 11px', background: '#F3F4F6', borderRadius: 16, fontSize: 12, border: `1px solid ${LINE}`, fontFamily: 'system-ui' }}>{item}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Materials */}
      {report.materials_received && (
        <Section title="Materials & Deliveries">
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{report.materials_received}</div>
        </Section>
      )}

      {/* Subcontractors */}
      {subcontractors.length > 0 && (
        <Section title="Subcontractors on Site">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'system-ui' }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {['Company', 'Trade', 'Workers', 'Hours'].map(h => (
                  <th key={h} style={{ padding: '7px 9px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subcontractors.map((sub: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid #F3F4F6` }}>
                  <td style={{ padding: '7px 9px' }}>{sub.company || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{sub.trade || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{sub.workers || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{sub.hours || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Delays / Safety / Issues callouts */}
      {report.delays && <Section title="Delays & Impacts" accent="#F59E0B"><Callout text={report.delays} bg="#FFFBEB" border="#FDE68A" color="#92400E" /></Section>}
      {(report as any).safety_notes && <Section title="Safety Observations" accent={SAPPHIRE}><Callout text={(report as any).safety_notes} bg="#EFF6FF" border="#BFDBFE" color="#1E40AF" /></Section>}
      {report.issues_encountered && <Section title="Issues & Incidents" accent="#EF4444"><Callout text={report.issues_encountered} bg="#FEF2F2" border="#FECACA" color="#B91C1C" /></Section>}

      {/* Visitors */}
      {visitorLog.length > 0 && (
        <Section title="Visitors & Inspections">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'system-ui' }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {['Name', 'Company', 'Purpose', 'Time'].map(h => (
                  <th key={h} style={{ padding: '7px 9px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitorLog.map((v: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid #F3F4F6` }}>
                  <td style={{ padding: '7px 9px' }}>{v.name || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{v.company || v.organization || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{v.purpose || '—'}</td>
                  <td style={{ padding: '7px 9px' }}>{v.arrivalTime || v.time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Photos — large 2-up grid, with captions when present (photos_meta) */}
      {(photoMeta.length > 0 || photos.length > 0) && (
        <Section title={`Site Photos (${photoMeta.length || photos.length})`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {(photoMeta.length > 0 ? photoMeta : photos.map((u) => ({ url: u, caption: '' }))).map((p, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${LINE}`, breakInside: 'avoid' }}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                  <img src={p.url} alt={p.caption || `Photo ${i + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </a>
                {p.caption ? <div style={{ fontSize: 11, color: MUTED, padding: '6px 8px', fontFamily: 'system-ui' }}>{p.caption}</div> : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Photos referenced in the original log but not embedded */}
      {photos.length === 0 && photoNames.length > 0 && (
        <Section title={`Photos Referenced (${photoNames.length})`}>
          <div style={{ fontSize: 12, color: MUTED, fontFamily: 'system-ui', marginBottom: 6 }}>
            Listed in the original Procore log (view the attached document below for the images):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {photoNames.map((n, i) => (
              <span key={i} style={{ padding: '3px 9px', background: '#F3F4F6', borderRadius: 14, fontSize: 11, border: `1px solid ${LINE}`, fontFamily: 'monospace' }}>{n}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Original document */}
      {pdfPath && (
        <Section title="Original Inspection Document">
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
            <object data={pdfPath} type="application/pdf" style={{ width: '100%', height: 540, display: 'block' }}>
              <div style={{ padding: 14, fontSize: 13, fontFamily: 'system-ui' }}>
                <a href={pdfPath} target="_blank" rel="noopener noreferrer" style={{ color: SAPPHIRE, fontWeight: 700 }}>Open original document ↗</a>
              </div>
            </object>
          </div>
        </Section>
      )}

      {/* Reviewed seal */}
      {(report as any).reviewed_at && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <DailyReviewSeal name={(report as any).reviewed_by_name} at={(report as any).reviewed_at} />
        </div>
      )}

      {/* Signature */}
      <div style={{ borderTop: `2px solid ${LINE}`, marginTop: 28, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: 'system-ui' }}>Submitted by</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{inspector || 'Site Supervisor'}</div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: 'system-ui' }}>{inspector ? 'Site Supervisor' : ''}</div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: 'system-ui' }}>
            {pc.completed_at || safeFormat((report as any).submitted_at ?? report.created_at, 'MMMM d, yyyy h:mm a')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {signature && signature.startsWith('data:image') ? (
            <img src={signature} alt="Signature" style={{ height: 52, marginLeft: 'auto', display: 'block' }} />
          ) : signature ? (
            <div style={{ fontFamily: 'cursive', fontSize: 22 }}>{signature}</div>
          ) : null}
          <div style={{ borderTop: `1px solid #9CA3AF`, width: 210, paddingTop: 4, marginLeft: 'auto' }}>
            <div style={{ fontSize: 11, color: MUTED, fontFamily: 'system-ui' }}>
              Authorized Signature{(report as any).signature_date ? ` · ${safeFormat((report as any).signature_date, 'MMM d, yyyy')}` : ''}
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: letter; margin: 0.5in; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>
    </div>
  );
}
