import { describe, expect, it } from 'vitest';
import { buildConsultingReportHtml, reportHeadings } from '../consultingReport';
import type { ConsultingReport, ConsultingReportSource } from '@/hooks/useConsultingReports';

const report: ConsultingReport = {
  id: 'report-1', tenant_id: 'tenant-1', project_id: 'project-1',
  title: 'Site Review — Draft', subtitle: 'Conditions – recommendations', report_date: '2026-09-08',
  status: 'draft', conversation: [],
  body_html: '<h2>Executive Summary</h2><p>Visible facts — and interpretation.</p><h2>Recommendations</h2><p>Review the work.</p>',
  generation_notes: {}, created_by: null, issued_at: null, issued_by: null,
  created_at: '2026-09-08T12:00:00Z', updated_at: '2026-09-08T12:00:00Z',
};

const source: ConsultingReportSource = {
  id: 'source-1', tenant_id: 'tenant-1', project_id: 'project-1', report_id: 'report-1',
  source_type: 'google_drive', source_name: 'Walk Photo 01.jpg', mime_type: 'image/jpeg',
  size_bytes: 2048, storage_path: 'private/photo.jpg', drive_file_id: 'drive-1', drive_web_url: null,
  extracted_text: null, caption: 'North elevation', included: true, sort_order: 0,
  created_by: null, created_at: '2026-09-08T12:00:00Z',
};

describe('consulting report template', () => {
  it('builds a branded cover, table of contents, photos, and source manifest', () => {
    const html = buildConsultingReportHtml({ projectName: 'R4 Consulting', report, sources: [source], imageUrls: { 'source-1': 'https://example.com/photo.jpg' } });
    expect(html).toContain('APAS Consulting');
    expect(html).toContain('Table of Contents');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Photographic Record');
    expect(html).toContain('Source Manifest');
    expect(html).toContain('Walk Photo 01.jpg');
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it('derives the contents list from level-two report headings', () => {
    expect(reportHeadings(report.body_html).map((entry) => entry.title)).toEqual(['Executive Summary', 'Recommendations']);
  });

  it('places selected and mandatory evidence while retaining other sources only in the manifest', () => {
    const optional = { ...source, id: 'optional', selected_for_report: false };
    const mandatory = { ...source, id: 'required', included: false, placement_mode: 'mandatory' as const, selected_for_report: false };
    const receipt = { ...source, id: 'receipt', mime_type: 'application/pdf', placement_mode: 'mandatory' as const, source_name: 'Required receipt.pdf' };
    const html = buildConsultingReportHtml({ projectName: 'R4', report, sources: [optional, mandatory, receipt], imageUrls: { optional: 'https://example.com/omit.jpg', required: 'https://example.com/keep.jpg' }, documentPages: { receipt: ['https://example.com/page1.jpg', 'https://example.com/page2.jpg'] } });
    expect(html).not.toContain('https://example.com/omit.jpg');
    expect(html).toContain('https://example.com/keep.jpg');
    expect(html).toContain('https://example.com/page1.jpg');
    expect(html).toContain('https://example.com/page2.jpg');
    expect(html).toContain('Required receipt.pdf | Page 2');
  });

  it('removes executable markup from edited report content', () => {
    const unsafeReport = {
      ...report,
      body_html: '<h2 onclick="alert(1)">Findings</h2><script>alert(1)</script><p><a href="javascript:alert(1)">Review</a></p>',
    };
    const html = buildConsultingReportHtml({ projectName: 'R4 Consulting', report: unsafeReport, sources: [] });
    expect(html).toContain('Findings');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('javascript:');
  });
});
