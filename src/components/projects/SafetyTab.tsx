import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShieldAlert, AlertTriangle, HardHat, Users } from 'lucide-react';
import { useSafetyIncidents, useCreateSafetyIncident, useToolboxTalks, useCreateToolboxTalk } from '@/hooks/useProjectSafety';

const severityColors: Record<string, string> = {
  minor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  moderate: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  serious: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const incidentTypes: Record<string, string> = {
  near_miss: 'Near Miss',
  first_aid: 'First Aid',
  recordable: 'Recordable',
  lost_time: 'Lost Time',
  property_damage: 'Property Damage',
  environmental: 'Environmental',
};

export function SafetyTab({ projectId }: { projectId: string }) {
  const { data: incidents } = useSafetyIncidents(projectId);
  const { data: talks } = useToolboxTalks(projectId);
  const createIncident = useCreateSafetyIncident();
  const createTalk = useCreateToolboxTalk();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [talkDialogOpen, setTalkDialogOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ title: '', incident_type: 'near_miss', severity: 'minor', description: '', location: '' });
  const [talkForm, setTalkForm] = useState({ topic: '', presenter: '', description: '', duration_minutes: 15 });

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    await createIncident.mutateAsync({ project_id: projectId, ...incidentForm });
    setIncidentDialogOpen(false);
    setIncidentForm({ title: '', incident_type: 'near_miss', severity: 'minor', description: '', location: '' });
  };

  const handleCreateTalk = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTalk.mutateAsync({ project_id: projectId, ...talkForm });
    setTalkDialogOpen(false);
    setTalkForm({ topic: '', presenter: '', description: '', duration_minutes: 15 });
  };

  const oshaRecordable = incidents?.filter(i => i.osha_recordable).length || 0;
  const totalIncidents = incidents?.length || 0;
  const daysSinceIncident = incidents?.length
    ? Math.floor((Date.now() - new Date(incidents[0].incident_date).getTime()) / 86400000)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{daysSinceIncident}</p>
            <p className="text-xs text-muted-foreground">Days Since Last Incident</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{totalIncidents}</p>
            <p className="text-xs text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{oshaRecordable}</p>
            <p className="text-xs text-muted-foreground">OSHA Recordable</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <HardHat className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{talks?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Toolbox Talks</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="toolbox-talks">Toolbox Talks</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Safety Incidents</CardTitle>
                  <CardDescription>Track and report safety events</CardDescription>
                </div>
                <Button onClick={() => setIncidentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!incidents?.length ? (
                <div className="text-center py-12">
                  <ShieldAlert className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="font-medium text-green-600">No incidents reported</p>
                  <p className="text-sm text-muted-foreground">Keep up the good safety record!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.map(i => (
                    <div key={i.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <h4 className="font-medium">{i.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(i.incident_date), 'MMM d, yyyy')}</span>
                            {i.location && <span>• {i.location}</span>}
                          </div>
                          {i.description && <p className="text-sm text-muted-foreground mt-2">{i.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={severityColors[i.severity] || ''}>
                            {i.severity}
                          </Badge>
                          <Badge variant="secondary">{incidentTypes[i.incident_type] || i.incident_type}</Badge>
                          {i.osha_recordable && <Badge variant="destructive">OSHA</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toolbox-talks" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Toolbox Talks</CardTitle>
                  <CardDescription>Safety training and briefing records</CardDescription>
                </div>
                <Button onClick={() => setTalkDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Talk
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!talks?.length ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No toolbox talks recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {talks.map(t => (
                    <div key={t.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{t.topic}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{format(new Date(t.talk_date), 'MMM d, yyyy')}</span>
                            {t.presenter && <span>• Led by {t.presenter}</span>}
                            {t.duration_minutes && <span>• {t.duration_minutes} min</span>}
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground mt-2">{t.description}</p>}
                        </div>
                        <Badge variant="secondary">
                          {t.attendees?.length || 0} attendees
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Incident Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Safety Incident</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateIncident} className="space-y-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={incidentForm.title} onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={incidentForm.incident_type} onValueChange={v => setIncidentForm({ ...incidentForm, incident_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(incidentTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={incidentForm.severity} onValueChange={v => setIncidentForm({ ...incidentForm, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input value={incidentForm.location} onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} rows={3} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => setIncidentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createIncident.isPending}>Report</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toolbox Talk Dialog */}
      <Dialog open={talkDialogOpen} onOpenChange={setTalkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Toolbox Talk</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTalk} className="space-y-4">
            <div className="grid gap-2">
              <Label>Topic *</Label>
              <Input value={talkForm.topic} onChange={e => setTalkForm({ ...talkForm, topic: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Presenter</Label>
                <Input value={talkForm.presenter} onChange={e => setTalkForm({ ...talkForm, presenter: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={talkForm.duration_minutes} onChange={e => setTalkForm({ ...talkForm, duration_minutes: parseInt(e.target.value) || 15 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={talkForm.description} onChange={e => setTalkForm({ ...talkForm, description: e.target.value })} rows={3} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => setTalkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTalk.isPending}>Add Talk</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
