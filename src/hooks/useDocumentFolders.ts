import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentFolderNode extends DocumentFolder {
  children: DocumentFolderNode[];
}

export function buildFolderTree(folders: DocumentFolder[]): DocumentFolderNode[] {
  const byId = new Map<string, DocumentFolderNode>();
  folders.forEach((folder) => {
    byId.set(folder.id, { ...folder, children: [] });
  });

  const roots: DocumentFolderNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: DocumentFolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

export function useDocumentFolders() {
  return useQuery({
    queryKey: ['document-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DocumentFolder[];
    },
  });
}

export function useCreateDocumentFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: name.trim(),
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DocumentFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      toast.success('Folder created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}

export function useUpdateDocumentFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      parentId,
    }: {
      id: string;
      name?: string;
      parentId?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();
      if (parentId !== undefined) updates.parent_id = parentId;

      const { data, error } = await supabase
        .from('document_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Folder updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update folder: ${error.message}`);
    },
  });
}

export function useDeleteDocumentFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Folder deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete folder: ${error.message}`);
    },
  });
}
