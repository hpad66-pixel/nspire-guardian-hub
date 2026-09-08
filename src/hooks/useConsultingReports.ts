import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { requireTenantId } from '@/lib/tenant';
import { htmlToText, parseUpload } from '@/lib/docs/parseUpload';
import { DOCS_BUCKET } from '@/hooks/useProjectDocuments';

export interface ReportConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ConsultingReport {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  subtitle: string | null;
  report_date: string;
  status: 'draft' | 'ready' | 'issued';
  conversation: ReportConversationMessage[];
  body_html: string;
  generation_notes: Record<string, unknown>;
  created_by: string | null;
  issued_at: string | null;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingReportSource {
  id: string;
  tenant_id: string;
  project_id: string;
  report_id: string;
  source_type: 'upload' | 'google_drive' | 'project_document';
  source_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  drive_file_id: string | null;
  drive_web_url: string | null;
  extracted_text: string | null;
  caption: string | null;
  included: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  preview_url?: string | null;
}

const REPORT_COLUMNS = 'id,tenant_id,project_id,title,subtitle,report_date,status,conversation,body_html,generation_notes,created_by,issued_at,issued_by,created_at,updated_at';
const SOURCE_COLUMNS = 'id,tenant_id,project_id,report_id,source_type,source_name,mime_type,size_bytes,storage_path,drive_file_id,drive_web_url,extracted_text,caption,included,sort_order,created_by,created_at';

type ReportUpdate = Database['public']['Tables']['consulting_reports']['Update'];
type SourceUpdate = Database['public']['Tables']['consulting_report_sources']['Update'];

function serializeReportUpdate(patch: Partial<ConsultingReport>): ReportUpdate {
  return {
    title: patch.title,
    subtitle: patch.subtitle,
    report_date: patch.report_date,
    status: patch.status,
    conversation: patch.conversation as unknown as Json | undefined,
    body_html: patch.body_html,
    generation_notes: patch.generation_notes as unknown as Json | undefined,
    issued_at: patch.issued_at,
    issued_by: patch.issued_by,
  };
}

function serializeSourceUpdate(patch: Partial<ConsultingReportSource>): SourceUpdate {
  return {
    source_name: patch.source_name,
    mime_type: patch.mime_type,
    size_bytes: patch.size_bytes,
    storage_path: patch.storage_path,
    drive_file_id: patch.drive_file_id,
    drive_web_url: patch.drive_web_url,
    extracted_text: patch.extracted_text,
    caption: patch.caption,
    included: patch.included,
    sort_order: patch.sort_order,
  };
}

function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 140) || 'source';
}

async function sourceText(file: File): Promise<string | null> {
  if (file.type.startsWith('image/')) return null;
  if (file.type.startsWith('text/') || /\.(csv|tsv|txt|md)$/i.test(file.name)) {
    return (await file.text()).slice(0, 120_000);
  }
  if (/\.(pdf|docx)$/i.test(file.name)) {
    try {
      const parsed = await parseUpload(file);
      return parsed.text.slice(0, 120_000);
    } catch {
      return null;
    }
  }
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return workbook.SheetNames.slice(0, 8).map((name) => {
        const worksheet = workbook.Sheets[name];
        return `WORKSHEET: ${name}\n${XLSX.utils.sheet_to_csv(worksheet)}`;
      }).join('\n\n').slice(0, 120_000);
    } catch {
      return null;
    }
  }
  return null;
}

export function useConsultingReports(projectId: string | null) {
  const qc = useQueryClient();
  const key = ['consulting-reports', projectId];

  const list = useQuery({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ConsultingReport[]> => {
      const { data, error } = await supabase
        .from('consulting_reports')
        .select(REPORT_COLUMNS)
        .eq('project_id', projectId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConsultingReport[];
    },
  });

  const create = useMutation<ConsultingReport, Error, string>({
    mutationFn: async (title): Promise<ConsultingReport> => {
      if (!projectId) throw new Error('A project is required.');
      const tenantId = await requireTenantId();
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('consulting_reports')
        .insert({ tenant_id: tenantId, project_id: projectId, title, created_by: auth.user?.id ?? null })
        .select(REPORT_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as ConsultingReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ConsultingReport>) => {
      const { error } = await supabase.from('consulting_reports').update(serializeReportUpdate(patch)).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: sourceRows } = await supabase.from('consulting_report_sources').select('storage_path').eq('report_id', id);
      const paths = ((sourceRows ?? []) as unknown as Array<{ storage_path: string | null }>).map((row) => row.storage_path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(DOCS_BUCKET).remove(paths);
      const { error } = await supabase.from('consulting_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, remove };
}

export function useConsultingReportSources(reportId: string | null, projectId: string | null) {
  const qc = useQueryClient();
  const key = ['consulting-report-sources', reportId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    enabled: Boolean(reportId),
    queryFn: async (): Promise<ConsultingReportSource[]> => {
      const { data, error } = await supabase
        .from('consulting_report_sources')
        .select(SOURCE_COLUMNS)
        .eq('report_id', reportId!)
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      const rows = (data ?? []) as unknown as ConsultingReportSource[];
      return await Promise.all(rows.map(async (row) => {
        if (!row.storage_path || !row.mime_type?.startsWith('image/')) return row;
        const { data: signed } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(row.storage_path, 60 * 60);
        return { ...row, preview_url: signed?.signedUrl ?? null };
      }));
    },
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      if (!reportId || !projectId) throw new Error('Open a report before adding sources.');
      const tenantId = await requireTenantId();
      const { data: auth } = await supabase.auth.getUser();
      const startOrder = list.data?.length ?? 0;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const sourceId = crypto.randomUUID();
        const path = `${tenantId}/${projectId}/reports/${reportId}/${sourceId}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        const extractedText = await sourceText(file);
        const { error: insertError } = await supabase.from('consulting_report_sources').insert({
          id: sourceId,
          tenant_id: tenantId,
          project_id: projectId,
          report_id: reportId,
          source_type: 'upload',
          source_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          storage_path: path,
          extracted_text: extractedText,
          caption: file.type.startsWith('image/') ? htmlToText(file.name.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '')) : null,
          sort_order: startOrder + index,
          created_by: auth.user?.id ?? null,
        });
        if (insertError) {
          await supabase.storage.from(DOCS_BUCKET).remove([path]);
          throw insertError;
        }
      }
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ConsultingReportSource>) => {
      const { error } = await supabase.from('consulting_report_sources').update(serializeSourceUpdate(patch)).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (source: ConsultingReportSource) => {
      if (source.storage_path) await supabase.storage.from(DOCS_BUCKET).remove([source.storage_path]);
      const { error } = await supabase.from('consulting_report_sources').delete().eq('id', source.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...list, upload, update, remove };
}
