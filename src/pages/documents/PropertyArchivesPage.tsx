import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArchiveHero } from '@/components/documents/ArchiveHero';
import { ArchiveCategoryCard } from '@/components/documents/ArchiveCategoryCard';
import { ArchiveDocumentCard } from '@/components/documents/ArchiveDocumentCard';
import { ArchiveUploadDialog } from '@/components/documents/ArchiveUploadDialog';
import { ArchiveViewerSheet } from '@/components/documents/ArchiveViewerSheet';
import {
  usePropertyArchives,
  useArchiveCategoryStats,
  useTotalArchiveCount,
  ARCHIVE_CATEGORIES,
  PropertyArchive,
} from '@/hooks/usePropertyArchives';
import { useUserPermissions } from '@/hooks/usePermissions';

export default function PropertyArchivesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<PropertyArchive | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: archives, isLoading } = usePropertyArchives(selectedCategory || undefined);
  const { data: categoryStats } = useArchiveCategoryStats();
  const { data: totalCount } = useTotalArchiveCount();
  const { canCreate, canUpdate } = useUserPermissions();
  const canUpload = canCreate('documents');
  const canEdit = canUpdate('documents');

  const filteredArchives = archives?.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.received_from?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (doc: PropertyArchive) => {
    setViewerDocument(doc);
    setViewerOpen(true);
  };

  const handleDownload = (doc: PropertyArchive) => {
    window.open(doc.file_url, '_blank');
  };

  const selectedCategoryData = ARCHIVE_CATEGORIES.find(
    (cat) => cat.id === selectedCategory
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>
      </motion.div>

      {/* Hero */}
      <ArchiveHero
        canUpload={canUpload}
        onUpload={() => setUploadDialogOpen(true)}
        totalCount={totalCount || 0}
      />

      {/* Category Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ARCHIVE_CATEGORIES.map((cat, index) => (
          <ArchiveCategoryCard
            key={cat.id}
            id={cat.id}
            label={cat.label}
            icon={cat.icon}
            description={cat.description}
            count={categoryStats?.[cat.id] || 0}
            isSelected={selectedCategory === cat.id}
            onClick={() =>
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
            }
            index={index}
          />
        ))}
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>
                {selectedCategoryData?.label || 'All Documents'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredArchives?.length || 0} documents
                {selectedCategoryData && (
                  <span className="ml-2">• {selectedCategoryData.description}</span>
                )}
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archives..."
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
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredArchives && filteredArchives.length > 0 ? (
            <div className="space-y-2">
              {filteredArchives.map((doc, index) => (
                <ArchiveDocumentCard
                  key={doc.id}
                  document={doc}
                  canEdit={canEdit}
                  onView={handleView}
                  onDownload={handleDownload}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No archives found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : selectedCategory
                  ? 'No documents in this category yet'
                  : 'Start by adding your first permanent record'}
              </p>
              {canUpload && !searchQuery && (
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  Add Document
                </Button>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      {canUpload && (
        <ArchiveUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          defaultCategory={selectedCategory || 'as-builts'}
        />
      )}

      {/* Viewer Sheet */}
      <ArchiveViewerSheet
        document={viewerDocument}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
