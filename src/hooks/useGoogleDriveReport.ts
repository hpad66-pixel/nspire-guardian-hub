import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

async function invokeGmail(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('gmail', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useGoogleDriveReport(reportId: string | null, projectId: string | null) {
  const qc = useQueryClient();

  const listFolder = useMutation({
    mutationFn: async (folderUrl: string): Promise<GoogleDriveFile[]> => {
      const data = await invokeGmail({ action: 'drive-list', folderUrl });
      return Array.isArray(data?.files) ? data.files as GoogleDriveFile[] : [];
    },
  });

  const importFiles = useMutation({
    mutationFn: async (fileIds: string[]): Promise<{ imported: Array<{ id: string; name: string }>; skipped: number }> => {
      if (!reportId || !projectId) throw new Error('Open a report before importing files.');
      return await invokeGmail({ action: 'drive-import', reportId, projectId, fileIds });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consulting-report-sources', reportId] }),
  });

  return { listFolder, importFiles };
}
