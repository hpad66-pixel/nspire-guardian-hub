import { useState } from 'react';
import { format, isPast, differenceInDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Shield, CheckCircle2, BookOpen, Lightbulb, AlertTriangle,
  ClipboardCheck, Award,
} from 'lucide-react';
import {
  useWarranties, useCreateWarranty,
  useCloseoutItems, useCreateCloseoutItem, useToggleCloseoutItem,
  useLessonsLearned, useCreateLesson,
} from '@/hooks/useProjectCloseout';

const warrantyStatusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  expiring_soon: 'bg-amber-500/10 text-amber-500',
  expired: 'bg-destructive/10 text-destructive',
};

const closeoutCategories: Record<string, string> = {
  general: 'General',
  documentation: 'Documentation',
  inspections: 'Final Inspections',
  financial: 'Financial Closeout',
  training: 'Owner Training',
  warranty: 'Warranties',
};

const lessonCategories: Record<string, string> = {
  general: 'General',
  schedule: 'Schedule',
  budget: 'Budget',
  quality: 'Quality',
  safety: 'Safety',
  communication: 'Communication',
  procurement: 'Procurement',
};

export function CloseoutTab({ projectId }: { projectId: string }) {
  const { data: warranties } = useWarranties(projectId);
  const { data: closeoutItems } = useCloseoutItems(projectId);
  const { data: lessons } = useLessonsLearned(projectId);
  const createWarranty = useCreateWarranty();
  const createCloseoutItem = useCreateCloseoutItem();
  const toggleCloseout = useToggleCloseoutItem();
  const createLesson = useCreateLesson();

  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [closeoutDialogOpen, setCloseoutDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [wForm, setWForm] = useState({ item_name: '', vendor: '', start_date: '', end_date: '', coverage_details: '' });
  const [cForm, setCForm] = useState({ title: '', category: 'general', description: '' });
  const [lForm, setLForm] = useState({ title: '', category: 'general', what_happened: '', lesson: '', recommendation: '' });

  const completedItems = closeoutItems?.filter(i => i.is_completed).length || 0;
  const totalItems = closeoutItems?.length || 0;
  const closeoutProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getWarrantyStatus = (endDate: string | null) => {
    if (!endDate) return 'active';
    const daysLeft = differenceInDays(new Date(endDate), new Date());
    if (daysLeft < 0) return 'expired';
    if (daysLeft < 90) return 'expiring_soon';
    return 'active';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{closeoutProgress}%</p>
                <p className="text-xs text-muted-foreground">Closeout Complete</p>
              </div>
            </div>
            <Progress value={closeoutProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{completedItems} of {totalItems} items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{warranties?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Warranties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{lessons?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Lessons Recorded</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
        </TabsList>

        {/* Closeout Checklist */}
        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Closeout Checklist</CardTitle>
                  <CardDescription>Track project closeout deliverables</CardDescription>
                </div>
                <Button onClick={() => setCloseoutDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!closeoutItems?.length ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No closeout items defined</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {closeoutItems.map(item => (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.is_completed ? 'bg-muted/50' : 'bg-card'}`}>
                      <Checkbox
                        checked={item.is_completed || false}
                        onCheckedChange={(checked) =>
                          toggleCloseout.mutate({ id: item.id, is_completed: !!checked, projectId })
                        }
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs">{closeoutCategories[item.category] || item.category}</Badge>
                      {item.is_completed && item.completed_at && (
                        <span className="text-xs text-muted-foreground">{format(new Date(item.completed_at), 'MMM d')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warranties */}
        <TabsContent value="warranties" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Warranty Tracking</CardTitle>
                  <CardDescription>Monitor warranties and expiration dates</CardDescription>
                </div>
                <Button onClick={() => setWarrantyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warranty
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!warranties?.length ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No warranties tracked</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warranties.map(w => {
                    const status = getWarrantyStatus(w.end_date);
                    return (
                      <div key={w.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{w.item_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {w.vendor && <span>{w.vendor}</span>}
                              {w.start_date && w.end_date && (
                                <span>
                                  {format(new Date(w.start_date), 'MMM yyyy')} - {format(new Date(w.end_date), 'MMM yyyy')}
                                </span>
                              )}
                            </div>
                            {w.coverage_details && <p className="text-sm text-muted-foreground mt-2">{w.coverage_details}</p>}
                          </div>
                          <Badge variant="outline" className={warrantyStatusColors[status]}>
                            {status === 'expiring_soon' ? (
                              <><AlertTriangle className="h-3 w-3 mr-1" />Expiring Soon</>
                            ) : status === 'expired' ? 'Expired' : (
                              <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lessons Learned */}
        <TabsContent value="lessons" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lessons Learned</CardTitle>
                  <CardDescription>Capture insights for future projects</CardDescription>
                </div>
                <Button onClick={() => setLessonDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!lessons?.length ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No lessons recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map(l => (
                    <div key={l.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <h4 className="font-medium">{l.title}</h4>
                        <Badge variant="secondary" className="text-xs">{lessonCategories[l.category] || l.category}</Badge>
                      </div>
                      {l.what_happened && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground">What happened:</p>
                          <p className="text-sm">{l.what_happened}</p>
                        </div>
                      )}
                      {l.lesson && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Lesson:</p>
                          <p className="text-sm">{l.lesson}</p>
                        </div>
                      )}
                      {l.recommendation && (
                        <div className="p-2 rounded bg-primary/5 border border-primary/10">
                          <p className="text-xs font-medium text-primary">Recommendation:</p>
                          <p className="text-sm">{l.recommendation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warranty Dialog */}
      <Dialog open={warrantyDialogOpen} onOpenChange={setWarrantyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Warranty</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => { e.preventDefault(); await createWarranty.mutateAsync({ project_id: projectId, ...wForm }); setWarrantyDialogOpen(false); setWForm({ item_name: '', vendor: '', start_date: '', end_date: '', coverage_details: '' }); }} className="space-y-4">
            <div className="grid gap-2"><Label>Item *</Label><Input value={wForm.item_name} onChange={e => setWForm({ ...wForm, item_name: e.target.value })} required /></div>
            <div className="grid gap-2"><Label>Vendor</Label><Input value={wForm.vendor} onChange={e => setWForm({ ...wForm, vendor: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={wForm.start_date} onChange={e => setWForm({ ...wForm, start_date: e.target.value })} /></div>
              <div className="grid gap-2"><Label>End Date</Label><Input type="date" value={wForm.end_date} onChange={e => setWForm({ ...wForm, end_date: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Coverage Details</Label><Textarea value={wForm.coverage_details} onChange={e => setWForm({ ...wForm, coverage_details: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setWarrantyDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createWarranty.isPending}>Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Closeout Item Dialog */}
      <Dialog open={closeoutDialogOpen} onOpenChange={setCloseoutDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Closeout Item</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => { e.preventDefault(); await createCloseoutItem.mutateAsync({ project_id: projectId, ...cForm }); setCloseoutDialogOpen(false); setCForm({ title: '', category: 'general', description: '' }); }} className="space-y-4">
            <div className="grid gap-2"><Label>Title *</Label><Input value={cForm.title} onChange={e => setCForm({ ...cForm, title: e.target.value })} required /></div>
            <div className="grid gap-2"><Label>Category</Label><Select value={cForm.category} onValueChange={v => setCForm({ ...cForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(closeoutCategories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea value={cForm.description} onChange={e => setCForm({ ...cForm, description: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCloseoutDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createCloseoutItem.isPending}>Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Lesson Learned</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => { e.preventDefault(); await createLesson.mutateAsync({ project_id: projectId, ...lForm }); setLessonDialogOpen(false); setLForm({ title: '', category: 'general', what_happened: '', lesson: '', recommendation: '' }); }} className="space-y-4">
            <div className="grid gap-2"><Label>Title *</Label><Input value={lForm.title} onChange={e => setLForm({ ...lForm, title: e.target.value })} required /></div>
            <div className="grid gap-2"><Label>Category</Label><Select value={lForm.category} onValueChange={v => setLForm({ ...lForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(lessonCategories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>What Happened</Label><Textarea value={lForm.what_happened} onChange={e => setLForm({ ...lForm, what_happened: e.target.value })} rows={2} /></div>
            <div className="grid gap-2"><Label>Lesson</Label><Textarea value={lForm.lesson} onChange={e => setLForm({ ...lForm, lesson: e.target.value })} rows={2} /></div>
            <div className="grid gap-2"><Label>Recommendation</Label><Textarea value={lForm.recommendation} onChange={e => setLForm({ ...lForm, recommendation: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createLesson.isPending}>Record</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
