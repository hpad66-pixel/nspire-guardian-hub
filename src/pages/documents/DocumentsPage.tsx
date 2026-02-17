import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  FileText,
  FolderOpen,
  Search,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  File,
  FileImage,
  FileSpreadsheet,
  FileType,
  Upload,
  AlertTriangle,
  Archive,
  Lock,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Edit3,
  Move,
  Trash,
} from 'lucide-react';
import {
  useOrganizationDocuments,
  useArchiveOrganizationDocument,
  type OrganizationDocument,
} from '@/hooks/useDocuments';
import { useTotalArchiveCount } from '@/hooks/usePropertyArchives';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/usePermissions';
import { getSignedUrlForBucket } from '@/lib/storage';
import { toast } from 'sonner';
import {
  buildFolderTree,
  useCreateDocumentFolder,
  useDeleteDocumentFolder,
  useDocumentFolders,
  useUpdateDocumentFolder,
  type DocumentFolder,
  type DocumentFolderNode,
} from '@/hooks/useDocumentFolders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
  
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileType className="h-5 w-5 text-red-500" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FolderTreeItem({
  node,
  depth,
  selectedFolderId,
  expandedFolderIds,
  onSelect,
  onToggle,
  canManageFolders,
  onCreateSubfolder,
  onRename,
  onMove,
  onDelete,
}: {
  node: DocumentFolderNode;
  depth: number;
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;
  onSelect: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  canManageFolders: boolean;
  onCreateSubfolder: (parentId: string) => void;
  onRename: (folderId: string) => void;
  onMove: (folderId: string) => void;
  onDelete: (folderId: string) => void;
}) {
  const isExpanded = expandedFolderIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
          selectedFolderId === node.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={cn(
              "h-6 w-6 flex items-center justify-center rounded-sm",
              selectedFolderId === node.id ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="h-6 w-6" />
        )}
        <button type="button" className="flex-1 text-left" onClick={() => onSelect(node.id)}>
          {node.name}
        </button>
        {canManageFolders && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateSubfolder(node.id)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(node.id)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(node.id)}>
                <Move className="h-4 w-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(node.id)} className="text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              expandedFolderIds={expandedFolderIds}
              onSelect={onSelect}
              onToggle={onToggle}
              canManageFolders={canManageFolders}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderModal, setFolderModal] = useState<{
    mode: 'create' | 'rename' | 'move' | 'delete' | null;
    folderId?: string;
    parentId?: string | null;
  }>({ mode: null });
  const [folderNameInput, setFolderNameInput] = useState('');
  const [moveParentId, setMoveParentId] = useState<string | null>(null);
  
  const { data: folders } = useDocumentFolders();
  const { data: documents, isLoading } = useOrganizationDocuments(selectedFolderId);
  const { data: archiveCount } = useTotalArchiveCount();
  const archiveDocument = useArchiveOrganizationDocument();
  const createFolder = useCreateDocumentFolder();
  const updateFolder = useUpdateDocumentFolder();
  const deleteFolder = useDeleteDocumentFolder();
  const { isAdmin, isOwner } = useUserPermissions();
  const canManageFolders = isAdmin || isOwner;
  
  const folderTree = useMemo(
    () => buildFolderTree(folders || []),
    [folders]
  );
  
  const folderById = useMemo(() => {
    const map: Record<string, DocumentFolder> = {};
    (folders || []).forEach((folder) => {
      map[folder.id] = folder;
    });
    return map;
  }, [folders]);
  
  const folderPathById = useMemo(() => {
    const map: Record<string, string[]> = {};
    const buildPath = (folderId: string): string[] => {
      if (map[folderId]) return map[folderId];
      const folder = folderById[folderId];
      if (!folder) return [];
      const parentPath = folder.parent_id ? buildPath(folder.parent_id) : [];
      const path = [...parentPath, folder.name];
      map[folderId] = path;
      return path;
    };
    Object.keys(folderById).forEach((id) => buildPath(id));
    return map;
  }, [folderById]);
  
  const folderOptions = useMemo(() => {
    const options: { id: string; label: string; path: string[] }[] = [];
    const walk = (nodes: DocumentFolderNode[], depth: number) => {
      nodes.forEach((node) => {
        options.push({
          id: node.id,
          label: `${depth > 0 ? `${'— '.repeat(depth)}` : ''}${node.name}`,
          path: folderPathById[node.id] || [node.name],
        });
        if (node.children.length > 0) {
          walk(node.children, depth + 1);
        }
      });
    };
    walk(folderTree, 0);
    return options;
  }, [folderTree, folderPathById]);
  
  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  
  const getFolderPathLabel = (folderId: string | null) => {
    if (!folderId) return 'All Documents';
    const path = folderPathById[folderId];
    return path ? path.join(' / ') : 'All Documents';
  };
  
  const getDocumentPath = (doc: OrganizationDocument) => {
    if (doc.folder_id && folderPathById[doc.folder_id]) {
      return folderPathById[doc.folder_id].join(' / ');
    }
    if (doc.subfolder) {
      return `${doc.folder} / ${doc.subfolder}`;
    }
    return doc.folder || 'Unfiled';
  };
  
  const getDescendantIds = (rootId: string): Set<string> => {
    const descendants = new Set<string>();
    const walk = (nodeId: string) => {
      (folders || []).forEach((folder) => {
        if (folder.parent_id === nodeId) {
          descendants.add(folder.id);
          walk(folder.id);
        }
      });
    };
    walk(rootId);
    return descendants;
  };
  
  const activeFolder = folderModal.folderId ? folderById[folderModal.folderId] : null;
  const moveOptions = useMemo(() => {
    if (folderModal.mode !== 'move' || !folderModal.folderId) return [];
    const invalidIds = getDescendantIds(folderModal.folderId);
    invalidIds.add(folderModal.folderId);
    return folderOptions.filter((option) => !invalidIds.has(option.id));
  }, [folderModal, folderOptions, folders]);
  
  const openDocumentUrl = async (doc: OrganizationDocument) => {
    try {
      const signedUrl = await getSignedUrlForBucket('organization-documents', doc.file_url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      toast.error('Failed to open document');
    }
  };
  
  const handleArchive = async (id: string) => {
    await archiveDocument.mutateAsync(id);
  };
  
  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry.getTime() - now.getTime() < thirtyDays && expiry > now;
  };
  
  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };
  
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          </div>
          <p className="text-muted-foreground">
            Organization-wide document library and file management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageFolders && (
            <Button
              variant="outline"
              onClick={() => {
                setFolderModal({ mode: 'create', parentId: selectedFolderId });
                setFolderNameInput('');
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Property Archives Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/documents/archives">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-4 right-4 opacity-10">
              <Lock className="h-24 w-24 text-amber-400" />
            </div>
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Archive className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Property Archives
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        Permanent
                      </Badge>
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-lg">
                      As-built drawings, equipment manuals, permits, and design documents. 
                      Permanently retained. View and download only.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {archiveCount !== undefined && archiveCount > 0 && (
                    <div className="text-center px-4 py-2 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold">{archiveCount}</p>
                      <p className="text-xs text-slate-400">documents</p>
                    </div>
                  )}
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                <Lock className="h-3 w-3" />
                <span>Admin-managed • No deletion</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Working Documents Section Header */}
      <div className="flex items-center gap-3">
        <FolderOpen className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Working Documents</h2>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar - Folders */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedFolderId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  All Documents
                </div>
              </button>
              
              {folderTree.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-2">
                  No folders yet
                </div>
              ) : (
                <div className="space-y-1">
                  {folderTree.map((node) => (
                    <FolderTreeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      selectedFolderId={selectedFolderId}
                      expandedFolderIds={expandedFolderIds}
                      onSelect={setSelectedFolderId}
                      onToggle={toggleFolderExpanded}
                      canManageFolders={canManageFolders}
                      onCreateSubfolder={(parentId) => {
                        setFolderModal({ mode: 'create', parentId });
                        setFolderNameInput('');
                      }}
                      onRename={(folderId) => {
                        setFolderModal({ mode: 'rename', folderId });
                        setFolderNameInput(folderById[folderId]?.name || '');
                      }}
                      onMove={(folderId) => {
                        setFolderModal({ mode: 'move', folderId });
                        setMoveParentId(folderById[folderId]?.parent_id || null);
                      }}
                      onDelete={(folderId) => {
                        setFolderModal({ mode: 'delete', folderId });
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium">{filteredDocuments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiring Soon</span>
                <span className="font-medium text-warning">
                  {documents?.filter(d => isExpiringSoon(d.expiry_date)).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expired</span>
                <span className="font-medium text-destructive">
                  {documents?.filter(d => isExpired(d.expiry_date)).length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{getFolderPathLabel(selectedFolderId)}</CardTitle>
                <CardDescription>
                  {filteredDocuments?.length || 0} documents
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredDocuments && filteredDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.mime_type)}
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDocumentPath(doc)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <div className="flex items-center gap-1">
                            {isExpired(doc.expiry_date) && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                            {isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                              <AlertTriangle className="h-3 w-3 text-warning" />
                            )}
                            <span className={cn(
                              "text-sm",
                              isExpired(doc.expiry_date) && "text-destructive",
                              isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && "text-warning"
                            )}>
                              {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDocumentUrl(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDocumentUrl(doc)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleArchive(doc.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Upload your first document to get started'}
                </p>
                {!searchQuery && isAdmin && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Folder Modals */}
      <Dialog
        open={folderModal.mode === 'create' || folderModal.mode === 'rename'}
        onOpenChange={(open) => {
          if (!open) {
            setFolderModal({ mode: null });
            setFolderNameInput('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {folderModal.mode === 'create' ? 'Create Folder' : 'Rename Folder'}
            </DialogTitle>
            <DialogDescription>
              {folderModal.mode === 'create'
                ? 'Folders can be empty and organized in a tree.'
                : 'Rename the selected folder.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFolderModal({ mode: null });
                setFolderNameInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!folderNameInput.trim()) return;
                if (folderModal.mode === 'create') {
                  await createFolder.mutateAsync({
                    name: folderNameInput,
                    parentId: folderModal.parentId ?? null,
                  });
                } else if (folderModal.mode === 'rename' && folderModal.folderId) {
                  await updateFolder.mutateAsync({
                    id: folderModal.folderId,
                    name: folderNameInput,
                  });
                }
                setFolderModal({ mode: null });
                setFolderNameInput('');
              }}
              disabled={!folderNameInput.trim()}
            >
              {folderModal.mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog
        open={folderModal.mode === 'move'}
        onOpenChange={(open) => {
          if (!open) {
            setFolderModal({ mode: null });
            setMoveParentId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Move Folder</DialogTitle>
            <DialogDescription>
              Choose a new parent for {activeFolder?.name || 'this folder'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New Parent</Label>
            <Select
              value={moveParentId || 'root'}
              onValueChange={(value) => {
                setMoveParentId(value === 'root' ? null : value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root</SelectItem>
                {moveOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFolderModal({ mode: null });
                setMoveParentId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!folderModal.folderId) return;
                await updateFolder.mutateAsync({
                  id: folderModal.folderId,
                  parentId: moveParentId ?? null,
                });
                setFolderModal({ mode: null });
                setMoveParentId(null);
              }}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog
        open={folderModal.mode === 'delete'}
        onOpenChange={(open) => {
          if (!open) setFolderModal({ mode: null });
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              This folder must be empty (no subfolders or documents) to be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFolderModal({ mode: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!folderModal.folderId) return;
                await deleteFolder.mutateAsync(folderModal.folderId);
                if (selectedFolderId === folderModal.folderId) {
                  setSelectedFolderId(null);
                }
                setFolderModal({ mode: null });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultFolderId={selectedFolderId}
        folderOptions={folderOptions}
        folderPathById={folderPathById}
      />
    </div>
  );
}
