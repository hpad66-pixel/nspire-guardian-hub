import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortalDocumentsProps {
  projectId: string;
  accentColor: string;
}

interface SharedDocument {
  id: string;
  name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  folder: string;
  description?: string | null;
}

interface ClientUpload {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  description: string | null;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.includes('image'))       return FileImage;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return FileText;
  return File;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SECTION_ORDER = ['contracts', 'drawings', 'permits', 'reports', 'photos', 'other'];
const SECTION_LABELS: Record<string, string> = {
  contracts: 'Contracts & Agreements',
  drawings:  'Plans & Drawings',
  permits:   'Permits',
  reports:   'Reports',
  photos:    'Photos',
  other:     'Other Files',
};

export function PortalDocuments({ projectId, accentColor }: PortalDocumentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Team documents query ────────────────────────────────────
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['portal-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Portal documents fetch:', error.message);
        return [];
      }
      return (data ?? []) as SharedDocument[];
    },
    enabled: !!projectId,
  });

  // ── Client uploads query ────────────────────────────────────
  const { data: clientUploads = [] } = useQuery({
    queryKey: ['portal-client-uploads', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_client_uploads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Portal client uploads fetch:', error.message);
        return [];
      }
      return (data ?? []) as ClientUpload[];
    },
    enabled: !!projectId,
  });

  // ── Upload handler ──────────────────────────────────────────
  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      // NOTE: Uses 'portal-uploads' storage bucket (public, created via migration)
      const ext = file.name.split('.').pop();
      const path = `${projectId}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from('portal-uploads')
        .upload(path, file);
      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('portal-uploads')
        .getPublicUrl(path);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('portal_client_uploads').insert({
        project_id: projectId,
        uploaded_by: user?.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['portal-client-uploads', projectId] });
      toast.success('File uploaded successfully');
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed');
      toast.error('Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  }

  // Group team docs by folder
  const grouped = documents.reduce<Record<string, SharedDocument[]>>((acc, doc) => {
    const key = doc.folder ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const sections = [
    ...SECTION_ORDER.filter((k) => grouped[k]?.length),
    ...Object.keys(grouped).filter((k) => !SECTION_ORDER.includes(k) && grouped[k]?.length),
  ];

  const isEmpty = documents.length === 0 && clientUploads.length === 0;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* ── Upload bar ─────────────────────────────────────────── */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
        <div
          className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.04]"
          style={{
            border: '1.5px dashed rgba(255,255,255,0.1)',
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 size={20} className="text-slate-400 animate-spin shrink-0" />
            ) : (
              <UploadCloud size={20} className="text-slate-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {uploading ? 'Uploading...' : 'Share a file with the team'}
              </p>
              {uploadError && (
                <p className="text-xs text-red-400 mt-0.5">{uploadError}</p>
              )}
            </div>
          </div>

          {!uploading && (
            <button
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accentColor, fontSize: 12 }}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Choose file
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state (both sections empty) ──────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <FileText size={28} className="text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium mb-1">No documents shared yet</p>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Your contractor will share contracts, plans, permits, and reports here as the project progresses.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: From Your Team ───────────────────────────── */}
      {documents.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">From Your Team</p>

          {sections.map((section, si) => (
            <motion.section
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.06 }}
            >
              <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-600 mb-3">
                {SECTION_LABELS[section] ?? section}
              </h2>

              <div className="space-y-2">
                {grouped[section].map((doc) => {
                  const Icon = getFileIcon(doc.mime_type);
                  return (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors group"
                    >
                      <div
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <Icon size={16} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-slate-600 group-hover:text-slate-300 transition-colors">
                        <ExternalLink size={14} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      {/* ── Section 2: Your Uploads ─────────────────────────────── */}
      {clientUploads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Your Uploads</p>

          <div className="space-y-2">
            {clientUploads.map((upload) => {
              const Icon = getFileIcon(upload.mime_type);
              return (
                <a
                  key={upload.id}
                  href={upload.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors group overflow-hidden"
                  style={{ borderLeft: `3px solid ${accentColor}` }}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Icon size={16} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{upload.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(upload.created_at), 'MMM d, yyyy')}
                      {upload.file_size ? ` · ${formatBytes(upload.file_size)}` : ''}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">uploaded by you</p>
                  </div>
                  <div className="shrink-0 text-slate-600 group-hover:text-slate-300 transition-colors">
                    <ExternalLink size={14} />
                  </div>
                </a>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="h-4" />
    </div>
  );
}
