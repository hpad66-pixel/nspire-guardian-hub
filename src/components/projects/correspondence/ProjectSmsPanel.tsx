import { useMemo, useState } from 'react';
import { MessageSquareText, Send, Smartphone, CheckCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectContacts } from '@/hooks/useProjectPeople';
import { useProjectSmsMessages } from '@/hooks/useProjectSms';
import { ProjectSmsComposer, type SmsRecipient } from './ProjectSmsComposer';

export function ProjectSmsPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data: contacts = [] } = useProjectContacts(projectId);
  const { data: messages = [], isLoading } = useProjectSmsMessages(projectId);
  const [recipient, setRecipient] = useState<SmsRecipient | null>(null);
  const contactNames = useMemo(() => new Map(contacts.map((contact) => [contact.contactId, contact.name])), [contacts]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Text an attached project contact</h3>
            <p className="text-xs text-muted-foreground">Messages and replies stay in this project. Contacts do not need a projOS account.</p>
          </div>
          {!contacts.some((contact) => contact.phone) && <Badge variant="outline">Add a mobile number in CRM</Badge>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {contacts.filter((contact) => contact.phone).map((contact) => (
            <Button key={contact.contactId} variant="outline" size="sm" className="gap-1.5" onClick={() => setRecipient({ contactId: contact.contactId, name: contact.name, phone: contact.phone, companyName: contact.companyName })}>
              <Send className="h-3.5 w-3.5" />{contact.name}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading project texts…</p>
      ) : messages.length === 0 ? (
        <Card><CardContent className="p-10 text-center"><Smartphone className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">No project texts yet</p><p className="mt-1 text-sm text-muted-foreground">Choose an attached contact above to start a recorded conversation.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => {
            const inbound = message.direction === 'inbound';
            const failed = message.status === 'failed' || message.status === 'undelivered';
            return (
              <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${inbound ? 'rounded-bl-md bg-card' : 'rounded-br-md border-[#0B3142]/15 bg-[#0B3142] text-white'}`}>
                  <div className={`mb-1 flex flex-wrap items-center gap-2 text-xs ${inbound ? 'text-muted-foreground' : 'text-white/70'}`}>
                    <span className="font-medium">{message.contact_id ? contactNames.get(message.contact_id) || 'Project contact' : 'Team member'}</span>
                    <span>·</span><span>{inbound ? 'Received' : 'Sent'} {format(new Date(message.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                  {!inbound && <div className={`mt-2 flex items-center justify-end gap-1 text-[10px] ${failed ? 'text-rose-300' : 'text-white/60'}`}>{failed ? <AlertCircle className="h-3 w-3" /> : <CheckCheck className="h-3 w-3" />}{message.status}{message.error_message ? ` · ${message.error_message}` : ''}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectSmsComposer open={Boolean(recipient)} onOpenChange={(next) => { if (!next) setRecipient(null); }} projectId={projectId} projectName={projectName} recipient={recipient} />
    </div>
  );
}
