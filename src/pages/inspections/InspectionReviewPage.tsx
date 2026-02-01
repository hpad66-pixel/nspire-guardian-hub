import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingReviews, DailyInspectionWithDetails } from '@/hooks/useInspectionReview';
import { InspectionReviewSheet } from '@/components/inspections/InspectionReviewSheet';
import { 
  ClipboardCheck, 
  Calendar, 
  User, 
  Building,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function InspectionReviewPage() {
  const { data: pendingInspections, isLoading } = usePendingReviews();
  const [selectedInspection, setSelectedInspection] = useState<DailyInspectionWithDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpenReview = (inspection: DailyInspectionWithDetails) => {
    setSelectedInspection(inspection);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ClipboardCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Inspection Review Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve daily grounds inspections
          </p>
        </div>

        {/* Pending Count */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : pendingInspections?.length || 0}
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Requires Action
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pending Inspections List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inspections Awaiting Review</CardTitle>
            <CardDescription>
              Click on an inspection to review details and take action
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingInspections && pendingInspections.length > 0 ? (
              <div className="space-y-3">
                {pendingInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    onClick={() => handleOpenReview(inspection)}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                        <ClipboardCheck className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {inspection.property?.name || 'Unknown Property'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(parseISO(inspection.inspection_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>
                              {inspection.inspector?.full_name || inspection.inspector?.email || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Pending Review</Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  No inspections pending review at this time.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Sheet */}
        <InspectionReviewSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          inspection={selectedInspection}
        />
      </div>
    </div>
  );
}
