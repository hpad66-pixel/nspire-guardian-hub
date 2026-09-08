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
      const files: GoogleDriveFile[] = [];
      let pageToken: string | null = null;
      do {
        const data = await invokeGmail({ action: 'drive-list', folderUrl, pageToken });
        if (Array.isArray(data.files)) files.push(...data.files);
        pageToken = data.nextPageToken || null;
      } while (pageToken);
      return files;
    },
  });

  const importFiles = useMutation({
    mutationFn: async ({ fileIds, placementMode = 'supporting' }: { fileIds: string[]; placementMode?: 'supporting' | 'mandatory' }): Promise<{ imported: Array<{ id: string; name: string }>; skipped: number }> => {
      if (!reportId || !projectId) throw new Error('Open a report before importing files.');
      const result: { imported: Array<{ id: string; name: string }>; skipped: number } = { imported: [], skipped: 0 };
      try {
        for (let start = 0; start < fileIds.length; start += 15) {
          const batch = await invokeGmail({ action: 'drive-import', reportId, projectId, fileIds: fileIds.slice(start, start + 15), placementMode });
          result.imported.push(...(batch.imported || []));
          result.skipped += Number(batch.skipped || 0);
        }
        return result;
      } finally {
        await qc.invalidateQueries({ queryKey: ['consulting-report-sources', reportId] });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consulting-report-sources', reportId] }),
  });

  return { listFolder, importFiles };
}
