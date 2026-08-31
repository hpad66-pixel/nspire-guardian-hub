import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileBadge2,
  FileSignature,
  FileText,
  FolderOpen,
  Landmark,
  Loader2,
  Map,
  Megaphone,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { financialSummary } from "@/lib/reports/financialReports";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { useClientPortalProject, useOwnerPortalHref } from "@/components/portal/ClientPortalProjectContext";
import { SiteAssetMap } from "@/components/projects/site-map/SiteAssetMap";
import { useAssets } from "@/hooks/useAssets";
import { useProject } from "@/hooks/useProjects";
import { GLORIETA_SITE_LAYOUT } from "@/lib/site-map/glorietaSiteLayout";

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

function LatestUpdate({ projectId }: { projectId: string | null }) {
  const href = useOwnerPortalHref();
  const { data: updates = [], isLoading } = useClientUpdates(projectId, { publishedOnly: true });
  const latest = updates[0];
  return (
    <section className="client-dashboard-panel client-dashboard-update">
      <div className="client-panel-heading">
        <div><span className="client-panel-icon is-blue"><Megaphone /></span><div><small>Project briefing</small><h2>Latest update</h2></div></div>
        <Link to={href("/updates")}>View history <ArrowRight /></Link>
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
  { to: "/site-map", label: "Site map", detail: "Interactive property assets & pond", icon: Map },
  { to: "/contract", label: "Contract", detail: "Executed agreement and changes", icon: FileText },
  { to: "/schedule", label: "Schedule", detail: "Milestones and critical path", icon: CalendarDays },
  { to: "/permits", label: "Permits", detail: "Closeout readiness and city status", icon: FileBadge2 },
  { to: "/reports", label: "Reports", detail: "Owner-ready project records", icon: BarChart3 },
  { to: "/documents", label: "Documents", detail: "Approved files in one place", icon: FolderOpen },
];

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const href = useOwnerPortalHref();
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
  const { data: project } = useProject(projectId ?? null);
  const { data: siteAssets = [] } = useAssets(project?.property_id ?? undefined);
  const showSiteMap =
    Boolean(projectId)
    && (
      (project?.name ?? "").toLowerCase().includes("conveyance")
      || (project?.name ?? "").toLowerCase().includes("sewer extension")
      || projectId === "4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d"
    );

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

      {showSiteMap && (
        <section className="space-y-3" data-testid="owner-dashboard-site-map">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <small className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Property command map</small>
              <h2 className="font-display text-2xl font-bold">See every asset on site</h2>
            </div>
            <Link to={href("/site-map")} className="text-sm font-semibold text-[var(--apas-sapphire)] hover:underline">
              Open full map <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          <SiteAssetMap
            layout={GLORIETA_SITE_LAYOUT}
            dbAssets={siteAssets}
            variant="hero"
            readOnly
          />
        </section>
      )}

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
              <Link key={co.id} to={href(`/cos/${co.id}`)} className="client-decision-row">
                <span className="client-decision-row__type"><FileSignature /><small>Change order</small></span>
                <span className="client-decision-row__detail"><strong>{co.title || `Owner change order ${co.co_no}`}</strong><small>OCO-{co.co_no} · Ready for review</small></span>
                <span className="client-decision-row__amount">{fmt(co.amount)}</span>
                <span className="client-decision-row__action">Review &amp; decide <ArrowRight /></span>
              </Link>
            ))}
            {pendingPayApps.map((payApp) => (
              <Link key={payApp.id} to={href(`/pay-apps/${payApp.id}`)} className="client-decision-row">
                <span className="client-decision-row__type"><WalletCards /><small>Pay application</small></span>
                <span className="client-decision-row__detail"><strong>Pay Application #{payApp.pay_app_no}</strong><small>Period ending {shortDate(payApp.period_end)}</small></span>
                <span className="client-decision-row__amount">{fmt(payApp.submitted_amount)}</span>
                <span className="client-decision-row__action">Review &amp; decide <ArrowRight /></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="client-dashboard-grid">
        <LatestUpdate projectId={projectId} />
        <section className="client-dashboard-panel client-dashboard-financial">
          <div className="client-panel-heading">
            <div><span className="client-panel-icon is-gold"><Landmark /></span><div><small>Approved financial view</small><h2>Financial status</h2></div></div>
            <Link to={href("/reports")}>Open reports <ArrowRight /></Link>
          </div>
          <FinancialSnapshot projectId={projectId} />
        </section>
      </div>

      <section className="client-dashboard-resources">
        <div className="client-dashboard-section-title">
          <div><small>Project record</small><h2>Find what you need</h2></div>
          <span>Only approved, client-facing information appears here.</span>
        </div>
        <div className="client-resource-grid">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link key={resource.to} to={href(resource.to)} className="client-resource-card">
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
