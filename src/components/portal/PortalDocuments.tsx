import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Download, FileImage, File, FileSpreadsheet, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.includes('image'))       return FileImage;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return FileText;
  return File;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
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
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['portal-documents', projectId],
    queryFn: async () => {
      // Fetch project_documents shared with client, or all project docs
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        // project_documents may not exist yet — return empty
        console.warn('Portal documents fetch:', error.message);
        return [];
      }
      return (data ?? []) as SharedDocument[];
    },
    enabled: !!projectId,
  });

  // Group by folder
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
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
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-bold text-white">Shared Documents</h1>

      {sections.map((section, si) => (
        <motion.section
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.06 }}
        >
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-3">
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

      <div className="h-4" />
    </div>
  );
}
