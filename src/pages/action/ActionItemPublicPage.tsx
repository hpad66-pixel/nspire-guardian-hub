/**
 * Public branded action-item card for CRM / external assignees.
 * Deep-linked from the assignment email — no app login required.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Calendar, User, AlertCircle } from "lucide-react";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/action-item-public`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface Card {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project: string;
  assignee_name: string | null;
  comments: Array<{ id: string; content: string; created_at: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

export default function ActionItemPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${FN_BASE}?token=${token}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setCard(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (status: string) => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, status, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSaved(true);
      setComment("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFCF9]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFCF9] p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-rose-500 mb-3" />
          <h1 className="text-xl font-bold">Action card unavailable</h1>
          <p className="text-sm text-muted-foreground mt-2">{err || "This link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const due = card.due_date
    ? new Date(`${card.due_date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "No due date";
  const assignedOn = new Date(card.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const done = card.status === "done";

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <div className="bg-gradient-to-br from-[#0D3B30] via-[#1A1714] to-[#1A1714] text-[#FAF8F4] px-6 py-10">
        <div className="max-w-xl mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Action item · APAS</div>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">{card.title}</h1>
          {card.project && <p className="mt-2 text-sm text-[#D9D4CB]">{card.project}</p>}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-6 pb-12">
        <div className="rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-0">{STATUS_LABEL[card.status] || card.status}</Badge>
              <Badge variant="outline" className="capitalize">{card.priority} priority</Badge>
            </div>

            {card.description && (
              <p className="text-sm text-[#3f3c38] leading-relaxed whitespace-pre-wrap">{card.description}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#FAF8F4] p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground"><User className="h-3.5 w-3.5" /> Assigned to</div>
                <div className="mt-1 font-semibold text-sm">{card.assignee_name || "You"}</div>
              </div>
              <div className="rounded-xl bg-[#FAF8F4] p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Due date</div>
                <div className="mt-1 font-semibold text-sm">{due}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Assigned on {assignedOn}</p>

            {card.comments?.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Updates</div>
                {card.comments.map((c) => (
                  <div key={c.id} className="rounded-lg border bg-[#FAF8F4] px-3 py-2 text-sm">
                    <p>{c.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {!done && (
              <div className="space-y-3 border-t pt-4">
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional note when you update this card…"
                />
                {err && <p className="text-sm text-rose-600">{err}</p>}
                {saved && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Saved</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={busy} onClick={() => updateStatus("in_progress")}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Mark in progress
                  </Button>
                  <Button disabled={busy} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus("done")}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark done
                  </Button>
                </div>
              </div>
            )}

            {done && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                <p className="font-semibold text-emerald-900">This action item is complete</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-4">APAS Project Controls · Powered by projOS</p>
      </div>
    </div>
  );
}
