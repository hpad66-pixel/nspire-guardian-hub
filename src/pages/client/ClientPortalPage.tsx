import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  FileText,
  Landmark,
  ListChecks,
  Loader2,
  LockKeyhole,
  Receipt,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import "@/pages/portal/client-portal.css";

type PortalAction = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  action_type: string;
  amount: number;
};

type PortalScope = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  pct: number;
  due_date: string | null;
};

type PortalMilestone = { name: string; due_date: string | null; status: string };
type PortalMeeting = { id: string; title: string; date: string | null; minutes: string | null; agenda: string | null };
type PortalInvoice = { invoice_no: string; status: string; issue_date: string | null; due_date: string | null; total: number };

type ConsultingPortalData = {
  brand: string;
  client: string | null;
  showFinancials: boolean;
  project: {
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    target_end_date: string | null;
  };
  overallPct: number;
  scopes: PortalScope[];
  milestones: PortalMilestone[];
  actionItems: PortalAction[];
  meetings: PortalMeeting[];
  invoices: PortalInvoice[];
};

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value || 0);

const fmtDate = (value?: string | null) => value
  ? new Date(value.length <= 10 ? `${value}T12:00:00` : value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  : "Date pending";

const SCOPE_STATE: Record<string, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "is-complete" },
  completed: { label: "Complete", cls: "is-complete" },
  in_progress: { label: "In progress", cls: "is-progress" },
  blocked: { label: "Blocked", cls: "is-blocked" },
  not_started: { label: "Not started", cls: "is-muted" },
};

function Section({ icon: Icon, eyebrow, title, children, count }: {
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="client-share-panel">
      <div className="client-share-panel__heading">
        <span><Icon /></span>
        <div><small>{eyebrow}</small><h2>{title}</h2></div>
        {count != null && <b>{count}</b>}
      </div>
      <div className="client-share-panel__body">{children}</div>
    </section>
  );
}

function readableRichText(value: string | null | undefined) {
  if (!value) return "";
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]+>/g, " ");
  return new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() || "";
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ConsultingPortalData>({
    queryKey: ["client-portal", token],
    queryFn: async () => {
      const { data: result, error: invokeError } = await supabase.functions.invoke("client-portal", { body: { token } });
      if (invokeError) throw new Error(invokeError.message);
      if (result?.error) throw new Error(result.error);
      return result as ConsultingPortalData;
    },
    enabled: Boolean(token),
    retry: false,
  });

  if (isLoading) {
    return <div className="client-access-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !data) {
    return (
      <div className="client-invite-page">
        <div className="client-access-grid" aria-hidden="true" />
        <div className="client-invite-card client-share-error">
          <div className="client-access-wordmark"><span>APAS</span><div><strong>Project Controls</strong><small>Powered by projOS</small></div></div>
          <div className="client-invite-status">
            <span className="is-error"><ShieldAlert /></span>
            <small><LockKeyhole /> Private client link</small>
            <h1>Link unavailable</h1>
            <p>This private link is invalid, expired, or has been revoked. Please ask your project team for a fresh link.</p>
          </div>
          <p className="client-invite-footnote">Private by design · Project-specific access only</p>
        </div>
      </div>
    );
  }

  const pendingActions = data.actionItems.filter((item) => ["pending", "viewed"].includes(item.status));
  const pendingAmount = pendingActions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const clientName = data.client || data.brand;
  const projectStatus = data.project.status?.replaceAll("_", " ") || "Active";

  return (
    <div className="client-share-app">
      <header className="client-share-header">
        <div className="client-share-header__inner">
          <div className="client-access-wordmark">
            <span>APAS</span>
            <div><strong>{data.brand}</strong><small>Secure client portal</small></div>
          </div>
          <div className="client-share-project">
            <small>Current engagement</small>
            <strong>{data.project.name}</strong>
          </div>
          <span className="client-share-secure"><ShieldCheck /> Private link</span>
        </div>
      </header>

      <main className="client-share-main">
        <section className="client-share-hero">
          <div>
            <span className="client-dashboard-eyebrow">{clientName} · {projectStatus}</span>
            <h1>{data.project.name}</h1>
            <p>{data.project.description || "A clear, current view of progress, decisions, milestones, and approved financial information."}</p>
            <div className="client-share-dates">
              {data.project.start_date && <span>Started {fmtDate(data.project.start_date)}</span>}
              {data.project.target_end_date && <span>Target {fmtDate(data.project.target_end_date)}</span>}
            </div>
          </div>
          <div className="client-share-progress">
            <strong>{Math.min(100, Math.max(0, data.overallPct))}%</strong>
            <span>Overall progress</span>
            <div><i style={{ width: `${Math.min(100, Math.max(0, data.overallPct))}%` }} /></div>
          </div>
        </section>

        <section className={`client-decision-center ${pendingActions.length ? "has-decisions" : "is-clear"}`}>
          <div className="client-decision-center__summary">
            <span className="client-decision-center__icon">{pendingActions.length ? <ClipboardCheck /> : <CheckCircle2 />}</span>
            <div>
              <small>Your action center</small>
              <h2>{pendingActions.length ? `${pendingActions.length} item${pendingActions.length === 1 ? "" : "s"} need your attention` : "You’re completely caught up"}</h2>
              <p>{pendingActions.length ? "The project team has identified these client-facing decisions and requests." : "Nothing is waiting for you right now. New requests will appear here first."}</p>
            </div>
            {pendingAmount > 0 && <strong className="client-decision-center__value">{money(pendingAmount)}<small>represented in requests</small></strong>}
          </div>
          {pendingActions.length > 0 && (
            <div className="client-decision-list">
              {pendingActions.map((item) => (
                <div key={item.id} className="client-decision-row client-share-decision-row">
                  <span className="client-decision-row__type"><AlertCircle /><small>{item.action_type?.replaceAll("_", " ") || "Decision"}</small></span>
                  <span className="client-decision-row__detail"><strong>{item.title}</strong><small>{item.description || `Due ${fmtDate(item.due_date)}`}</small></span>
                  <span className="client-decision-row__amount">{item.amount ? money(item.amount) : fmtDate(item.due_date)}</span>
                  <span className="client-decision-row__action">Contact project team</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="client-share-grid">
          <Section icon={ListChecks} eyebrow="Delivery" title="Scope of work" count={data.scopes.length}>
            {data.scopes.length ? (
              <div className="client-share-scope-list">
                {data.scopes.map((scope) => {
                  const state = SCOPE_STATE[scope.status] ?? SCOPE_STATE.not_started;
                  const percent = Math.min(100, Math.max(0, Number(scope.pct) || 0));
                  return (
                    <div key={scope.id} className="client-share-scope">
                      <div><strong>{scope.title}</strong><span className={state.cls}>{percent}% · {state.label}</span></div>
                      {scope.description && <p>{scope.description}</p>}
                      <div className="client-share-track"><i style={{ width: `${percent}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="client-share-empty">No client-facing workstreams are published yet.</p>}
          </Section>

          <Section icon={CalendarDays} eyebrow="Schedule" title="Milestones" count={data.milestones.length}>
            {data.milestones.length ? (
              <div className="client-share-milestones">
                {data.milestones.map((milestone, index) => {
                  const complete = ["complete", "completed"].includes(milestone.status);
                  return (
                    <div key={`${milestone.name}-${index}`}>
                      {complete ? <CheckCircle2 /> : <Circle />}
                      <span className={complete ? "is-complete" : ""}><strong>{milestone.name}</strong><small>{fmtDate(milestone.due_date)}</small></span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="client-share-empty">No milestones are published yet.</p>}
          </Section>
        </div>

        <div className="client-share-grid">
          <Section icon={FileText} eyebrow="Verified record" title="Meetings & recaps" count={data.meetings.length}>
            {data.meetings.length ? (
              <div className="client-share-meetings">
                {data.meetings.map((meeting) => {
                  const open = openMeeting === meeting.id;
                  const body = readableRichText(meeting.minutes || meeting.agenda);
                  return (
                    <div key={meeting.id}>
                      <button type="button" onClick={() => setOpenMeeting(open ? null : meeting.id)} aria-expanded={open}>
                        <span><strong>{meeting.title}</strong><small>{fmtDate(meeting.date)}</small></span>
                        <ChevronDown className={cn(open && "is-open")} />
                      </button>
                      {open && <p>{body || "No client-facing recap is available for this meeting."}</p>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="client-share-empty">No meeting recaps are published yet.</p>}
          </Section>

          {data.showFinancials ? (
            <Section icon={Receipt} eyebrow="Approved financial view" title="Invoices" count={data.invoices.length}>
              {data.invoices.length ? (
                <div className="client-share-invoices">
                  {data.invoices.map((invoice, index) => (
                    <div key={`${invoice.invoice_no}-${index}`}>
                      <span><strong>Invoice #{invoice.invoice_no}</strong><small>{fmtDate(invoice.issue_date)}</small></span>
                      <span><b>{money(invoice.total)}</b><small className={`is-${invoice.status}`}>{invoice.status}</small></span>
                    </div>
                  ))}
                </div>
              ) : <p className="client-share-empty">No invoices have been shared for this engagement.</p>}
            </Section>
          ) : (
            <Section icon={Landmark} eyebrow="Financial privacy" title="Financials are private">
              <p className="client-share-empty">Financial information is not enabled for this private link. Contact your project team if you need a billing record.</p>
            </Section>
          )}
        </div>
      </main>

      <footer className="client-share-footer">
        <div><strong>{data.brand}</strong><span>Project clarity, decisions, and documentation in one private view.</span></div>
        <small>Powered by projOS · APAS Project Controls</small>
      </footer>
    </div>
  );
}
