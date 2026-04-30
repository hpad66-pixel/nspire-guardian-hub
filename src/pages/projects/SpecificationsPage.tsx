/**
 * B3 · SpecificationsPage — spec-set sidebar, CSI-division section list, and
 * in-place PDF page viewer. Supports bulk upload and submittal-register generation.
 */
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSpecSets, useSpecSections, type SpecSection } from "@/hooks/useSpecs";
import { SpecUploadDialog } from "@/components/specs/SpecUploadDialog";
import { SpecSectionViewer } from "@/components/specs/SpecSectionViewer";
import { GenerateRegisterButton } from "@/components/specs/GenerateRegisterButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";

export default function SpecificationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: sets = [], isLoading: setsLoading } = useSpecSets(projectId ?? null);
  const [setId, setSetId] = useState<string | null>(null);
  const activeSetId = setId ?? sets[0]?.id ?? null;
  const { data: sections = [] } = useSpecSections(activeSetId);
  const activeSet = sets.find((s) => s.id === activeSetId) ?? null;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) => s.section_number.toLowerCase().includes(q) || s.title.toLowerCase().includes(q),
    );
  }, [sections, search]);

  // Group by division for the column list.
  const grouped = useMemo(() => {
    const map = new Map<string, SpecSection[]>();
    for (const s of filtered) {
      const key = s.division || "00";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeSection = sections.find((s) => s.id === sectionId) ?? null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Specifications</h1>
          <p className="text-muted-foreground mt-1">CSI divisions and sections.</p>
        </div>
        <div className="flex gap-2">
          {projectId && activeSetId && (
            <GenerateRegisterButton projectId={projectId} variant="outline" />
          )}
          <Button onClick={() => setUploadOpen(true)} disabled={!projectId}>
            <Upload className="h-4 w-4 mr-2" />
            Upload spec set
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sets */}
        <aside className="lg:col-span-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sets</h2>
          {setsLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No spec sets yet.</div>
          ) : (
            <div className="space-y-1">
              {sets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSetId(s.id); setSectionId(null); }}
                  className={`w-full text-left p-3 rounded-md border transition ${
                    activeSetId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{s.set_date ?? "—"}</span>
                    <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Sections */}
        <section className="lg:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
              Sections · {filtered.length}
            </h2>
          </div>
          <Input
            placeholder="Search by number or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <Card>
            <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {sections.length === 0 ? "Select a set to see sections." : "No matches."}
                </div>
              ) : (
                grouped.map(([div, list]) => (
                  <div key={div}>
                    <div className="sticky top-0 bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
                      Division {div}
                    </div>
                    <ul className="divide-y">
                      {list.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => setSectionId(s.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/40 ${
                              sectionId === s.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <span className="font-mono text-muted-foreground mr-2">
                              {s.section_number}
                            </span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Viewer */}
        <section className="lg:col-span-5">
          <Card>
            <CardContent className="p-4">
              <SpecSectionViewer
                section={activeSection}
                pdfPath={activeSet?.pdf_path ?? null}
              />
            </CardContent>
          </Card>
        </section>
      </div>

      {projectId && (
        <SpecUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          projectId={projectId}
        />
      )}
    </div>
  );
}
