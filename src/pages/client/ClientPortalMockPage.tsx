import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  MessageSquareText,
  Mic2,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import "@/pages/client/client-portal-mock.css";

type SimpleProject = {
  id: string;
  title: string;
  status: string;
  currentUpdate: string;
  scope: string;
  schedule: string;
  budget: string;
  ownerActions: Array<{ task: string; due: string }>;
  apasDecisions: string[];
  needsFromClient: string[];
};

type UpdateTarget = "currentUpdate" | "scope" | "schedule" | "budget" | "needsFromClient" | "ownerActions" | "apasDecisions";
type TextField = "title" | "status" | "currentUpdate" | "scope" | "schedule" | "budget";

const targetOptions: Array<{ value: UpdateTarget; label: string }> = [
  { value: "currentUpdate", label: "Current update" },
  { value: "scope", label: "Scope" },
  { value: "schedule", label: "Schedule" },
  { value: "budget", label: "Budget" },
  { value: "needsFromClient", label: "What we need" },
  { value: "ownerActions", label: "Owner action item" },
  { value: "apasDecisions", label: "APAS decision" },
];

const initialProjects: SimpleProject[] = [
  {
    id: "r4-structural",
    title: "Buildings 3-6 Structural Repairs",
    status: "Needs owner decision",
    currentUpdate:
      "APAS is lining up engineering, field sequencing, and contractor prep for Buildings 3-6. The next move is choosing the inspection order so pricing and access plans stay realistic.",
    scope: "Engineering coordination, deficiency register, access planning, contractor package, and owner-facing recordkeeping.",
    schedule: "Inspection sequence this week. Contractor walk-through next week after owner confirmation.",
    budget: "$52.3k APAS owner-rep package. Construction-phase oversight and contractor pricing stay separate until scoped.",
    ownerActions: [
      { task: "Confirm inspection order for Buildings 3-6", due: "Sep 25" },
      { task: "Send access limits and resident notice constraints", due: "Sep 26" },
    ],
    apasDecisions: [
      "Separate engineering scope from owner-rep scope in the client view.",
      "Track deficiencies by building, location, severity, evidence, and owner impact.",
      "Hold contractor outreach until the inspection path is clear enough for usable pricing.",
    ],
    needsFromClient: [
      "Preferred inspection order",
      "Any resident access blackout dates",
      "Who should approve notices and permit-related communications",
    ],
  },
  {
    id: "r4-permits",
    title: "Permits & Expediting",
    status: "Preparing",
    currentUpdate:
      "The permit track is being kept separate so delays, filing responsibility, and owner approvals do not get buried inside the repair work.",
    scope: "Permit matrix, owner signer confirmation, filing dependencies, and client-safe status notes.",
    schedule: "Permit matrix follows the inspection sequence. Target owner contact confirmation by Sep 30.",
    budget: "No permit change event has been published.",
    ownerActions: [
      { task: "Confirm authorized signer and permit contact", due: "Sep 30" },
    ],
    apasDecisions: [
      "Show permits as their own track because they can move the whole schedule.",
      "Keep jurisdiction follow-ups internal until there is something useful for the client.",
    ],
    needsFromClient: [
      "Authorized signer",
      "Preferred permit contact",
    ],
  },
  {
    id: "r4-contractor",
    title: "Contractor Engagement",
    status: "Waiting on scope clarity",
    currentUpdate:
      "Contractor outreach should start after the field plan is specific enough to avoid vague pricing. The portal will show who was invited and what decision is coming.",
    scope: "Bid package outline, candidate list, site access notes, and recommendation summary.",
    schedule: "Outreach starts after the inspection path is approved.",
    budget: "Construction pricing has not been requested yet.",
    ownerActions: [],
    apasDecisions: [
      "Avoid early contractor pricing until scope is clear.",
      "Frame contractor requests around location-specific conditions and evidence.",
    ],
    needsFromClient: [
      "Access constraints",
      "Known contractor preferences or exclusions",
    ],
  },
];

const workflow = [
  "Talk the update",
  "Wrangle into one clean client note",
  "Approve",
  "Publish to the project site",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ClientPortalMockPage() {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(initialProjects[0].id);
  const [target, setTarget] = useState<UpdateTarget>("currentUpdate");
  const [rawUpdate, setRawUpdate] = useState(
    "We need the owner to confirm the inspection order for Buildings 3-6 before contractor outreach.",
  );
  const [wrangledUpdate, setWrangledUpdate] = useState(
    "Owner to confirm the inspection order for Buildings 3-6 before contractor outreach.",
  );
  const [pushStatus, setPushStatus] = useState("Not published yet");
  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? projects[0],
    [projects, selectedId],
  );

  function updateSelectedProject(updater: (project: SimpleProject) => SimpleProject) {
    setProjects((current) => current.map((project) => (
      project.id === selected.id ? updater(project) : project
    )));
  }

  function updateField(field: TextField, value: string) {
    updateSelectedProject((project) => ({ ...project, [field]: value }));
  }

  function updateListItem(field: "needsFromClient" | "apasDecisions", index: number, value: string) {
    updateSelectedProject((project) => ({
      ...project,
      [field]: project[field].map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  }

  function updateOwnerAction(index: number, key: "task" | "due", value: string) {
    updateSelectedProject((project) => ({
      ...project,
      ownerActions: project.ownerActions.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }));
  }

  function wrangleUpdate() {
    const clean = rawUpdate
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^(push|put|add)\s+(this\s+)?(to|into)\s+/i, "");
    setWrangledUpdate(clean || "Type or talk an update first.");
    setPushStatus("Wrangled. Edit it, then push.");
  }

  function pushUpdate() {
    const value = wrangledUpdate.trim();
    if (!value) return;
    updateSelectedProject((project) => {
      if (target === "needsFromClient") return { ...project, needsFromClient: [...project.needsFromClient, value] };
      if (target === "apasDecisions") return { ...project, apasDecisions: [...project.apasDecisions, value] };
      if (target === "ownerActions") return { ...project, ownerActions: [...project.ownerActions, { task: value, due: "Date pending" }] };
      return { ...project, [target]: value };
    });
    setPushStatus(`Pushed to ${targetOptions.find((option) => option.value === target)?.label}.`);
  }

  return (
    <div className="portal-simple">
      <header className="portal-simple__topbar">
        <a href="/client-portal-mock" className="portal-simple__brand" aria-label="client.projos.ai home">
          <span>{initials("Proj OS")}</span>
          <div>
            <strong>client.projos.ai</strong>
            <small>R4 / Glorieta Gardens</small>
          </div>
        </a>
        <div className="portal-simple__topbarCenter">
          <small>Current project</small>
          <strong>{selected.title}</strong>
        </div>
        <span className="portal-simple__private"><ShieldCheck /> Private client view</span>
      </header>

      <main className="portal-simple__shell">
        <aside className="portal-simple__leftRail" aria-label="Owner controls and project list">
          <section className="portal-simple__ownerConsole" aria-label="Owner update console">
            <div className="portal-simple__ownerHead">
              <Mic2 />
              <div>
                <small>Owner console</small>
                <strong>Talk. Wrangle. Push.</strong>
              </div>
            </div>

            <label>
              <span>Push where?</span>
              <select value={target} onChange={(event) => setTarget(event.target.value as UpdateTarget)}>
                {targetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label>
              <span>Talk or type raw update</span>
              <textarea value={rawUpdate} onChange={(event) => setRawUpdate(event.target.value)} />
            </label>

            <button type="button" className="portal-simple__ghostButton" onClick={wrangleUpdate}>
              <Edit3 /> Wrangle
            </button>

            <label>
              <span>Editable client-safe text</span>
              <textarea value={wrangledUpdate} onChange={(event) => setWrangledUpdate(event.target.value)} />
            </label>

            <button type="button" className="portal-simple__pushButton" onClick={pushUpdate}>
              <ArrowRight /> Push to box
            </button>
            <small className="portal-simple__pushStatus">{pushStatus}</small>
          </section>

          <section className="portal-simple__projects" aria-label="Project list">
            <div className="portal-simple__projectsHead">
              <small>Projects</small>
              <strong>Pick one</strong>
            </div>
            <div className="portal-simple__tabs" role="tablist" aria-label="R4 projects">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  role="tab"
                  aria-selected={project.id === selected.id}
                  className={project.id === selected.id ? "is-active" : ""}
                  onClick={() => setSelectedId(project.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{project.title}</strong>
                  <small>{project.status}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="portal-simple__main">
          <div className="portal-simple__editNotice">
            <Edit3 />
            <span>Owner editing mode. Every text box below can be edited before the client sees it.</span>
          </div>

          <section className="portal-simple__hero">
            <div>
              <input
                className="portal-simple__label portal-simple__inlineInput"
                aria-label="Project status"
                value={selected.status}
                onChange={(event) => updateField("status", event.target.value)}
              />
              <textarea
                className="portal-simple__titleInput"
                aria-label="Project title"
                value={selected.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
              <textarea
                className="portal-simple__copyInput portal-simple__copyInput--large"
                aria-label="Current update"
                value={selected.currentUpdate}
                onChange={(event) => updateField("currentUpdate", event.target.value)}
              />
            </div>
            <div className="portal-simple__needBox">
              <small>What APAS needs from you</small>
              <ul>
                {selected.needsFromClient.map((item, index) => (
                  <li key={`${item}-${index}`}>
                    <input
                      aria-label={`Needed from client ${index + 1}`}
                      value={item}
                      onChange={(event) => updateListItem("needsFromClient", index, event.target.value)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="portal-simple__three" aria-label="Scope schedule and budget">
            <article>
              <Target />
              <small>Scope</small>
              <textarea
                className="portal-simple__copyInput"
                aria-label="Scope"
                value={selected.scope}
                onChange={(event) => updateField("scope", event.target.value)}
              />
            </article>
            <article>
              <CalendarDays />
              <small>Schedule</small>
              <textarea
                className="portal-simple__copyInput"
                aria-label="Schedule"
                value={selected.schedule}
                onChange={(event) => updateField("schedule", event.target.value)}
              />
            </article>
            <article>
              <Banknote />
              <small>Budget</small>
              <textarea
                className="portal-simple__copyInput"
                aria-label="Budget"
                value={selected.budget}
                onChange={(event) => updateField("budget", event.target.value)}
              />
            </article>
          </section>

          <section className="portal-simple__decisionGrid">
            <article className="portal-simple__panel">
              <div className="portal-simple__panelHead">
                <ClipboardCheck />
                <div>
                  <small>Owner action items</small>
                  <h2>{selected.ownerActions.length ? "Needed now" : "Nothing waiting"}</h2>
                </div>
              </div>
              {selected.ownerActions.length ? (
                <div className="portal-simple__actions">
                  {selected.ownerActions.map((action, index) => (
                    <div key={action.task}>
                      <textarea
                        aria-label={`Owner action ${action.task}`}
                        value={action.task}
                        onChange={(event) => updateOwnerAction(index, "task", event.target.value)}
                      />
                      <input
                        aria-label={`Due date for ${action.task}`}
                        value={action.due}
                        onChange={(event) => updateOwnerAction(index, "due", event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="portal-simple__empty"><CheckCircle2 /> No client action is waiting right now.</p>
              )}
            </article>

            <article className="portal-simple__panel">
              <div className="portal-simple__panelHead">
                <MessageSquareText />
                <div>
                  <small>Decisions APAS is making</small>
                  <h2>Current calls</h2>
                </div>
              </div>
              <ul className="portal-simple__decisionList">
                {selected.apasDecisions.map((decision, index) => (
                  <li key={`${decision}-${index}`}>
                    <textarea
                      aria-label={`APAS decision ${index + 1}`}
                      value={decision}
                      onChange={(event) => updateListItem("apasDecisions", index, event.target.value)}
                    />
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="portal-simple__message">
            <div>
              <h2>Send something to the project team</h2>
              <p>Clients type it here. APAS talks updates on the staff side. The system turns both into one clean project note before publishing.</p>
            </div>
            <form onSubmit={(event) => event.preventDefault()}>
              <textarea aria-label="Message to APAS" placeholder="Type a note, question, approval, document reminder, or constraint..." />
              <button type="submit"><Send /> Send to APAS</button>
            </form>
          </section>

          <section className="portal-simple__workflow" aria-label="Update workflow">
            <div className="portal-simple__workflowTitle">
              <Mic2 />
              <div>
                <small>Staff-side update flow</small>
                <strong>Talk it once. Publish it cleanly.</strong>
              </div>
            </div>
            <ol>
              {workflow.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                  {index < workflow.length - 1 && <ArrowRight aria-hidden />}
                </li>
              ))}
            </ol>
          </section>
        </section>
      </main>
    </div>
  );
}
