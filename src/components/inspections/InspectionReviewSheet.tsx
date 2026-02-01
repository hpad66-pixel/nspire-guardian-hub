import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { VoiceDictationTextarea } from '@/components/ui/voice-dictation-textarea';
import { useInspectionItems, WEATHER_OPTIONS } from '@/hooks/useDailyInspections';
import { useAssets } from '@/hooks/useAssets';
import { useReviewInspection, DailyInspectionWithDetails } from '@/hooks/useInspectionReview';
import { AddendumList } from './AddendumList';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cloud, 
  Calendar,
  User,
  Image,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface InspectionReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: DailyInspectionWithDetails | null;
}

export function InspectionReviewSheet({ open, onOpenChange, inspection }: InspectionReviewSheetProps) {
  const [reviewerNotes, setReviewerNotes] = useState('');
  const { data: items = [] } = useInspectionItems(inspection?.id || '');
  const { data: assets = [] } = useAssets(inspection?.property_id);
  const reviewMutation = useReviewInspection();

  if (!inspection) return null;

  const weather = WEATHER_OPTIONS.find(w => w.value === inspection.weather);
  
  const stats = {
    ok: items.filter(i => i.status === 'ok').length,
    attention: items.filter(i => i.status === 'needs_attention').length,
    defect: items.filter(i => i.status === 'defect_found').length,
  };

  const getAssetName = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    return asset?.name || 'Unknown Asset';
  };

  const handleApprove = () => {
    reviewMutation.mutate({
      id: inspection.id,
      review_status: 'approved',
      reviewer_notes: reviewerNotes,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleRequestRevision = () => {
    if (!reviewerNotes.trim()) {
      return; // Require notes for revision request
    }
    reviewMutation.mutate({
      id: inspection.id,
      review_status: 'needs_revision',
      reviewer_notes: reviewerNotes,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleReject = () => {
    if (!reviewerNotes.trim()) {
      return; // Require notes for rejection
    }
    reviewMutation.mutate({
      id: inspection.id,
      review_status: 'rejected',
      reviewer_notes: reviewerNotes,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Review Inspection</SheetTitle>
          <SheetDescription>
            {inspection.property?.name} • {format(parseISO(inspection.inspection_date), 'MMMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Inspector & Weather Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inspector:</span>
              <span className="font-medium">
                {inspection.inspector?.full_name || inspection.inspector?.email || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Weather:</span>
              <span className="font-medium">
                {weather?.icon} {weather?.label || 'Not recorded'}
              </span>
            </div>
            {inspection.submitted_at && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">
                  {format(parseISO(inspection.submitted_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Summary */}
          <div>
            <h3 className="text-sm font-medium mb-3">Asset Status Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-600">{stats.ok}</p>
                <p className="text-xs text-green-600">OK</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-600">{stats.attention}</p>
                <p className="text-xs text-yellow-600">Attention</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-600">{stats.defect}</p>
                <p className="text-xs text-red-600">Defects</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Asset Details */}
          <div>
            <h3 className="text-sm font-medium mb-3">Asset Checks ({items.length})</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{getAssetName(item.asset_id)}</span>
                    <Badge 
                      variant={
                        item.status === 'ok' ? 'default' : 
                        item.status === 'needs_attention' ? 'secondary' : 'destructive'
                      }
                    >
                      {item.status === 'ok' ? 'OK' : 
                       item.status === 'needs_attention' ? 'Attention' : 'Defect'}
                    </Badge>
                  </div>
                  
                  {item.defect_description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Defect:</strong> {item.defect_description}
                    </p>
                  )}
                  
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Notes:</strong> {item.notes}
                    </p>
                  )}
                  
                  {item.photo_urls && item.photo_urls.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Image className="h-3 w-3" />
                      <span>{item.photo_urls.length} photo(s)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* General Notes */}
          {inspection.general_notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  General Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                  {inspection.general_notes}
                </p>
              </div>
            </>
          )}

          {/* Addendums */}
          <AddendumList inspectionId={inspection.id} />

          <Separator />

          {/* Reviewer Notes */}
          <div>
            <Label className="text-sm font-medium">Reviewer Notes</Label>
            <VoiceDictationTextarea
              value={reviewerNotes}
              onValueChange={setReviewerNotes}
              placeholder="Add notes about this review... Required for revision requests or rejections."
              className="min-h-[80px] mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Inspection
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                onClick={handleRequestRevision}
                disabled={reviewMutation.isPending || !reviewerNotes.trim()}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={reviewMutation.isPending || !reviewerNotes.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
            
            {!reviewerNotes.trim() && (
              <p className="text-xs text-muted-foreground text-center">
                Notes required for revision requests and rejections
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
