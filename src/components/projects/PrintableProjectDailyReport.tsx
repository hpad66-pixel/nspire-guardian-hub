import { format } from 'date-fns';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
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

export function PrintableProjectDailyReport({
  report, projectName, propertyName, propertyAddress, projectType, inspectorName, companyName = 'Daily Field Report',
}: PrintableProjectDailyReportProps) {
  const subcontractors = (report.subcontractors as any[]) ?? [];
  const visitorLog = (report.visitor_log as any[]) ?? [];
  const equipment = report.equipment_used ?? [];

  const sectionHeader = (title: string) => (
    <div style={{ background: '#1F2937', color: 'white', padding: '6px 12px', marginBottom: 8, marginTop: 16, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {title}
    </div>
  );

  return (
    <div
      id="printable-project-daily-report"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: 'white', color: '#111', padding: 32, maxWidth: 900 }}
    >
      {/* Header */}
      <div style={{ borderBottom: '3px solid #1F2937', paddingBottom: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{companyName}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginTop: 2 }}>DAILY FIELD REPORT</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{format(new Date(report.report_date), 'MMMM d, yyyy')}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Report #{report.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      {/* Project Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>Project</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{projectName}</div>
          {propertyName && <div style={{ fontSize: 12, color: '#4B5563' }}>{propertyName}</div>}
          {propertyAddress && <div style={{ fontSize: 12, color: '#4B5563' }}>{propertyAddress}</div>}
          {projectType && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>Type: {projectType}</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Inspector', value: inspectorName || 'N/A' },
            { label: 'Weather', value: report.weather || 'Not recorded' },
            { label: 'Workers on Site', value: String(report.workers_count || 0) },
            { label: 'Date', value: format(new Date(report.report_date), 'MMM d, yyyy') },
          ].map(item => (
            <div key={item.label} style={{ padding: 8, background: 'white', borderRadius: 6, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Row */}
      {(report.workers_count || equipment.length > 0 || subcontractors.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div style={{ padding: 10, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 10, color: '#1E40AF', textTransform: 'uppercase', fontWeight: 700 }}>Manpower Summary</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{report.workers_count || 0} workers total</div>
            {subcontractors.length > 0 && <div style={{ fontSize: 12, color: '#1E40AF' }}>{subcontractors.length} subcontractor(s)</div>}
          </div>
          {equipment.length > 0 && (
            <div style={{ padding: 10, background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 10, color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Equipment Summary</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{equipment.length} piece(s) on site</div>
            </div>
          )}
        </div>
      )}

      {/* Work Performed */}
      {sectionHeader('Work Performed Today')}
      <div style={{ padding: '8px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6 }}>
        {report.work_performed_html ? (
          <RichTextViewer content={report.work_performed_html} />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.work_performed}</p>
        )}
      </div>

      {/* Equipment */}
      {equipment.length > 0 && (
        <>
          {sectionHeader('Equipment on Site')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {equipment.map((item, i) => (
              <span key={i} style={{ padding: '4px 10px', background: '#F3F4F6', borderRadius: 20, fontSize: 12, border: '1px solid #E5E7EB' }}>{item}</span>
            ))}
          </div>
        </>
      )}

      {/* Materials */}
      {report.materials_received && (
        <>
          {sectionHeader('Materials & Deliveries')}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{report.materials_received}</p>
        </>
      )}

      {/* Subcontractors */}
      {subcontractors.length > 0 && (
        <>
          {sectionHeader('Subcontractors on Site')}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {['Company', 'Trade', 'Workers', 'Hours'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subcontractors.map((sub: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '6px 8px' }}>{sub.company || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{sub.trade || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{sub.workers || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{sub.hours || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Delays */}
      {report.delays && (
        <>
          {sectionHeader('Delays & Impacts')}
          <div style={{ padding: '8px 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6 }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{report.delays}</p>
          </div>
        </>
      )}

      {/* Safety */}
      {report.safety_notes && (
        <>
          {sectionHeader('Safety Observations')}
          <div style={{ padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6 }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{report.safety_notes}</p>
          </div>
        </>
      )}

      {/* Issues */}
      {report.issues_encountered && (
        <>
          {sectionHeader('Incidents & Issues')}
          <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{report.issues_encountered}</p>
          </div>
        </>
      )}

      {/* Visitors */}
      {visitorLog.length > 0 && (
        <>
          {sectionHeader('Visitors & Inspections')}
          {visitorLog.map((v: any, i: number) => (
            <div key={i} style={{ padding: '6px 8px', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
              <strong>{v.name}</strong> — {v.organization} · {v.purpose} · {v.arrivalTime}
              {v.inspectionResult && v.inspectionResult !== 'N/A' && <span style={{ marginLeft: 8, color: '#059669' }}> ({v.inspectionResult})</span>}
            </div>
          ))}
        </>
      )}

      {/* Photos */}
      {report.photos && report.photos.length > 0 && (
        <>
          {sectionHeader(`Photos (${report.photos.length})`)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {report.photos.slice(0, 12).map((url, i) => (
              <div key={i} style={{ aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Signature */}
      <div style={{ borderTop: '2px solid #E5E7EB', marginTop: 32, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Submitted by</div>
          <div style={{ fontWeight: 600 }}>{inspectorName || 'Site Supervisor'}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{format(new Date(report.created_at), 'MMMM d, yyyy h:mm a')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ borderTop: '1px solid #9CA3AF', width: 200, paddingTop: 4 }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Authorized Signature</div>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: letter; margin: 0.5in; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>
    </div>
  );
}
