import { useState } from 'react';
import { Loader2, Mail, NotebookPen, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AccountRollup, WaterExecNote, WaterServiceAccount } from '@/lib/water-intel';
import { useWaterInstruction, useWaterNotes, type WaterIntelScope } from '@/hooks/useWaterIntelligence';

export function WaterIntelNotes({
  scope,
  notes,
  accounts,
  rollups,
  propertyName,
  guest,
}: {
  scope: WaterIntelScope;
  notes: WaterExecNote[];
  accounts: WaterServiceAccount[];
  rollups: AccountRollup[];
  propertyName: string;
  guest?: boolean;
}) {
  const addNote = useWaterNotes(scope);
  const instruct = useWaterInstruction(scope);
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState(guest ? '' : '');
  const [authorEmail, setAuthorEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`Water Intelligence — ${propertyName}`);
  const [recipients, setRecipients] = useState('');
  const [instruction, setInstruction] = useState('');
  const [accountId, setAccountId] = useState<string>('');

  return (
    <section className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm" data-testid="water-intel-notes">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Executive desk</div>
          <h3 className="font-display text-2xl text-[#08271f]">Notes & instructions</h3>
        </div>
        <Button
          size="sm"
          className="bg-[#08271f] hover:bg-[#08271f]/90"
          onClick={() => setOpen(true)}
        >
          <Mail className="mr-1.5 h-4 w-4" /> Email instruction
        </Button>
      </div>

      <div className="space-y-2">
        {guest && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Your name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
            <Input placeholder="Your email" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} />
          </div>
        )}
        <Textarea
          placeholder="Capture a decision, a question for APAS, or a follow-up for the PM…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[88px]"
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            disabled={addNote.isPending || body.trim().length < 2}
            onClick={() =>
              addNote.mutate(
                { body, authorName, authorEmail },
                { onSuccess: () => setBody('') },
              )
            }
          >
            {addNote.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <NotebookPen className="mr-1.5 h-4 w-4" />}
            Save shared note
          </Button>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {notes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-[#dedbd1] px-4 py-6 text-sm text-[#8a8478]">
            No shared notes yet. The first one becomes the audit trail for this owner briefing.
          </li>
        )}
        {notes.map((note) => (
          <li key={note.id} className="rounded-2xl bg-[#F7F4EC] px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#8a8478]">
              <span className="font-semibold text-[#08271f]">{note.author_name || 'Executive'}</span>
              <span>{new Date(note.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#3d4a45]">{note.body}</p>
          </li>
        ))}
      </ol>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Send an instruction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Email anyone from this briefing — PM, counsel, bookkeeper, or the city. A copy is logged on the property.
          </p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <Input
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="Recipients — comma separated emails"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Entire property</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.building_label || a.service_address} · {a.account_number}
              </option>
            ))}
          </select>
          <Textarea
            className="min-h-[140px]"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={
              rollups[0]
                ? `Please pull actual meter reads for ${rollups[0].buildingLabel} and confirm the credit path with Opa-locka…`
                : 'Write the instruction…'
            }
          />
          <div className="flex justify-end">
            <Button
              className="bg-[#08271f] hover:bg-[#08271f]/90"
              disabled={instruct.isPending}
              onClick={() =>
                instruct.mutate(
                  { subject, body: instruction, recipients, accountId: accountId || null, propertyName },
                  { onSuccess: () => { setOpen(false); setInstruction(''); } },
                )
              }
            >
              {instruct.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Send via email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
