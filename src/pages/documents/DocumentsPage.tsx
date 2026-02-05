import { useState } from 'react';
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
  FileText,
  FolderOpen,
  Plus,
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
  Calendar,
  AlertTriangle,
  Archive,
  Lock,
  ChevronRight,
} from 'lucide-react';
import {
  useOrganizationDocuments,
  useDocumentFolderStats,
  useArchiveOrganizationDocument,
  DOCUMENT_FOLDERS,
  type OrganizationDocument,
} from '@/hooks/useDocuments';
import { useTotalArchiveCount } from '@/hooks/usePropertyArchives';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/usePermissions';

const folderIcons: Record<string, React.ReactNode> = {
  General: <FolderOpen className="h-4 w-4" />,
  Contracts: <FileText className="h-4 w-4" />,
  Permits: <FileType className="h-4 w-4" />,
  Insurance: <FileSpreadsheet className="h-4 w-4" />,
  Legal: <FileText className="h-4 w-4" />,
  Policies: <FileText className="h-4 w-4" />,
  Training: <FileText className="h-4 w-4" />,
  Reports: <FileSpreadsheet className="h-4 w-4" />,
};

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

export default function DocumentsPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const { data: documents, isLoading } = useOrganizationDocuments(selectedFolder || undefined);
  const { data: folderStats } = useDocumentFolderStats();
  const { data: archiveCount } = useTotalArchiveCount();
  const archiveDocument = useArchiveOrganizationDocument();
  const { isAdmin } = useUserPermissions();
  
  const filteredDocuments = documents?.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleDownload = (doc: OrganizationDocument) => {
    window.open(doc.file_url, '_blank');
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
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
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
            <CardContent className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedFolder === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  All Documents
                </div>
                <Badge variant="secondary" className="text-xs">
                  {documents?.length || 0}
                </Badge>
              </button>
              
              {DOCUMENT_FOLDERS.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedFolder === folder
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {folderIcons[folder] || <FolderOpen className="h-4 w-4" />}
                    {folder}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {folderStats?.[folder] || 0}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
          
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Documents</span>
                <span className="font-medium">{documents?.length || 0}</span>
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
                <CardTitle>{selectedFolder || 'All Documents'}</CardTitle>
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
                        <Badge variant="outline">{doc.folder}</Badge>
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
                            <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
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
                {!searchQuery && (
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
      
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultFolder={selectedFolder || 'General'}
      />
    </div>
  );
}
