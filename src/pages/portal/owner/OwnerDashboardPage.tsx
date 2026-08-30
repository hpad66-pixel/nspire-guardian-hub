import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSignature,
  FileText,
  FolderOpen,
  Landmark,
  Loader2,
  Megaphone,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { useClientActionItems } from "@/hooks/useClientCommunication";
import { financialSummary } from "@/lib/reports/financialReports";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { useClientPortalProject } from "@/components/portal/ClientPortalProjectContext";

function fmt(value: number | null | undefined) {
  return `$${(Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortDate(value: string | null | undefined) {
  if (!value) return "Date pending";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function FinancialSnapshot({ projectId }: { projectId: string | null }) {
  const { data, isLoading } = useFinancialReportData(projectId, { ownerSafe: true });
  if (isLoading) return <div className="client-dashboard-loading"><Loader2 className="animate-spin" /> Loading financial status…</div>;
  if (!data) return <div className="client-dashboard-empty">Financial reporting will appear here when the contract is ready.</div>;

  const summary = financialSummary(data);
  const percent = Math.min(100, Math.max(0, summary.pctComplete));
  const metrics = [
    ["Revised contract", fmt(summary.revisedValue)],
    ["Billed to date", fmt(summary.billedToDate)],
    ["Retainage held", fmt(summary.retainageHeld)],
    ["Balance to finish", fmt(summary.balanceToFinish)],
  ];

  return (
    <div className="client-financial-snapshot">
      <div className="client-financial-snapshot__metrics">
        {metrics.map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="client-financial-snapshot__progress">
        <div><span>Contract progress</span><strong>{percent.toFixed(1)}%</strong></div>
        <div className="client-progress-track" aria-label={`${percent.toFixed(1)} percent complete`}>
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>
      <p><ShieldCheck /> Owner-facing totals only. Internal vendor costs and private working data are not included.</p>
    </div>
  );
}

function OwnerAttention({ projectId }: { projectId: string | null }) {
  const { data: items = [] } = useClientActionItems(projectId ?? "");
  const pending = items.filter((item) => item.status === "pending" || item.status === "viewed");
  if (!projectId || pending.length === 0) return null;

  return (
    <section className="client-dashboard-panel" data-testid="owner-action-items">
      <div className="client-panel-heading">
        <div><span className="client-panel-icon is-gold"><ClipboardCheck /></span><div><small>Needs your input</small><h2>Items from your project team</h2></div></div>
      </div>
      <div className="client-decision-list">
        {pending.slice(0, 4).map((item) => (
          <div key={item.id} className="client-decision-row">
            <span className="client-decision-row__type"><ClipboardCheck /><small>{item.action_type.replace(/_/g, " ")}</small></span>
            <span className="client-decision-row__detail"><strong>{item.title}</strong><small>{item.due_date ? `Due ${shortDate(item.due_date)}` : "Awaiting your response"}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SharedFiles({ projectId }: { projectId: string | null }) {
  const { data: docs = [], isLoading } = useClientDocuments(projectId ?? undefined);
  return (
    <section className="client-dashboard-panel" data-testid="owner-shared-files">
      <div className="client-panel-heading">
        <div><span className="client-panel-icon is-blue"><FolderOpen /></span><div><small>Curated for you</small><h2>Shared files</h2></div></div>
        <Link to="/owner-portal/documents">All documents <ArrowRight /></Link>
      </div>
      {isLoading ? (
        <div className="client-dashboard-loading"><Loader2 className="animate-spin" /> Loading files…</div>
      ) : docs.length === 0 ? (
        <div className="client-dashboard-empty">Your team has not shared files yet. When they do, they appear here — not the full project repository.</div>
      ) : (
        <div className="client-decision-list">
          {docs.slice(0, 4).map((doc) => (
            <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="client-decision-row">
              <span className="client-decision-row__type"><FileText /><small>{doc.category || "Shared"}</small></span>
              <span className="client-decision-row__detail"><strong>{doc.name}</strong><small>Uploaded by your project team</small></span>
              <span className="client-decision-row__action">Open <ArrowRight /></span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function LatestUpdate({ projectId }: { projectId: string | null }) {
  const { data: updates = [], isLoading } = useClientUpdates(projectId, { publishedOnly: true });
  const latest = updates[0];
  return (
    <section className="client-dashboard-panel client-dashboard-update">
      <div className="client-panel-heading">
        <div><span className="client-panel-icon is-blue"><Megaphone /></span><div><small>Project briefing</small><h2>Latest update</h2></div></div>
        <Link to="/owner-portal/updates">View history <ArrowRight /></Link>
      </div>
      {isLoading ? (
        <div className="client-dashboard-loading"><Loader2 className="animate-spin" /> Loading update…</div>
      ) : latest ? (
        <div className="client-dashboard-update__body"><ClientUpdateView update={latest} /></div>
      ) : (
        <div className="client-dashboard-empty">Your first verified project update has not been published yet.</div>
      )}
    </section>
  );
}

const resources = [
  { to: "/owner-portal/contract", label: "Contract", detail: "Executed agreement and changes", icon: FileText },
  { to: "/owner-portal/schedule", label: "Schedule", detail: "Milestones and critical path", icon: CalendarDays },
  { to: "/owner-portal/reports", label: "Reports", detail: "Owner-ready project records", icon: BarChart3 },
  { to: "/owner-portal/documents", label: "Documents", detail: "Approved files in one place", icon: FolderOpen },
];

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useOwnerPortalData();
  const { selectedProjectId: projectId, selectedContract } = useClientPortalProject();
  const pendingOcos = (data?.pendingOcos ?? [])
    .filter((item) => item.prime_contract_id === selectedContract?.id);
  const pendingPayApps = (data?.pendingPayApps ?? [])
    .filter((item) => item.prime_contract_id === selectedContract?.id);
  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0];
  const decisionCount = pendingOcos.length + pendingPayApps.length;
  const pendingValue = pendingOcos.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    + pendingPayApps.reduce((sum, item) => sum + (Number(item.submitted_amount) || 0), 0);

  return (
    <div className="client-dashboard">
      <section className="client-dashboard-hero">
        <div>
          <span className="client-dashboard-eyebrow">Client command view</span>
          <h1>Good to see you, {firstName}.</h1>
          <p>Everything requiring your attention—followed by the latest verified project information.</p>
        </div>
        <div className="client-dashboard-hero__trust">
          <span><ShieldCheck /> Secure</span>
          <span><Clock3 /> Current portal view</span>
        </div>
      </section>

      <section id="decisions" className={`client-decision-center ${decisionCount ? "has-decisions" : "is-clear"}`}>
        <div className="client-decision-center__summary">
          <span className="client-decision-center__icon">{decisionCount ? <ClipboardCheck /> : <CheckCircle2 />}</span>
          <div>
            <small>Your action center</small>
            <h2>{isLoading ? "Checking your decisions…" : decisionCount ? `${decisionCount} decision${decisionCount === 1 ? "" : "s"} need your review` : "You’re completely caught up"}</h2>
            <p>{decisionCount ? `${fmt(pendingValue)} is currently represented in pending change orders and pay applications.` : "Nothing is waiting for your approval. We’ll place new decisions here when they are ready."}</p>
          </div>
          {decisionCount > 0 && <strong className="client-decision-center__value">{fmt(pendingValue)}<small>pending review</small></strong>}
        </div>

        {decisionCount > 0 && (
          <div className="client-decision-list">
            {pendingOcos.map((co) => (
              <Link key={co.id} to={`/owner-portal/cos/${co.id}`} className="client-decision-row">
                <span className="client-decision-row__type"><FileSignature /><small>Change order</small></span>
                <span className="client-decision-row__detail"><strong>{co.title || `Owner change order ${co.co_no}`}</strong><small>OCO-{co.co_no} · Ready for review</small></span>
                <span className="client-decision-row__amount">{fmt(co.amount)}</span>
                <span className="client-decision-row__action">Review &amp; decide <ArrowRight /></span>
              </Link>
            ))}
            {pendingPayApps.map((payApp) => (
              <Link key={payApp.id} to={`/owner-portal/pay-apps/${payApp.id}`} className="client-decision-row">
                <span className="client-decision-row__type"><WalletCards /><small>Pay application</small></span>
                <span className="client-decision-row__detail"><strong>Pay Application #{payApp.pay_app_no}</strong><small>Period ending {shortDate(payApp.period_end)}</small></span>
                <span className="client-decision-row__amount">{fmt(payApp.submitted_amount)}</span>
                <span className="client-decision-row__action">Review &amp; decide <ArrowRight /></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <OwnerAttention projectId={projectId} />

      <div className="client-dashboard-grid">
        <LatestUpdate projectId={projectId} />
        <section className="client-dashboard-panel client-dashboard-financial">
          <div className="client-panel-heading">
            <div><span className="client-panel-icon is-gold"><Landmark /></span><div><small>Approved financial view</small><h2>Financial status</h2></div></div>
            <Link to="/owner-portal/reports">Open reports <ArrowRight /></Link>
          </div>
          <FinancialSnapshot projectId={projectId} />
        </section>
      </div>

      <SharedFiles projectId={projectId} />

      <section className="client-dashboard-resources">
        <div className="client-dashboard-section-title">
          <div><small>Project record</small><h2>Find what you need</h2></div>
          <span>Only approved, client-facing information appears here.</span>
        </div>
        <div className="client-resource-grid">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link key={resource.to} to={resource.to} className="client-resource-card">
                <span><Icon /></span>
                <div><strong>{resource.label}</strong><small>{resource.detail}</small></div>
                <ArrowRight />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
