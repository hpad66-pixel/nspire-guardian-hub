import { useMemo } from "react";
import { ArrowLeft, Brain, FileText, FolderArchive, Sparkles } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DocumentWorkspace } from "@/components/projects/correspondence/DocumentWorkspace";
import { RepositoryTab } from "@/components/projects/RepositoryTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/hooks/useProjects";

type DocumentsView = "studio" | "files";

/**
 * One project Documents destination. The living, client-ready document workflow
 * and the historical/AI-queryable file repository belong together, but remain
 * clearly separated so users never confuse a draft letter with a source record.
 */
export default function ProjectRepositoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: project, isLoading } = useProject(projectId ?? null);
  const view = useMemo<DocumentsView>(
    () => searchParams.get("view") === "files" ? "files" : "studio",
    [searchParams],
  );

  const changeView = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "files") params.set("view", "files");
    else params.delete("view");
    setSearchParams(params, { replace: true });
  };

  if (!projectId) return null;

  return (
    <div className="container mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#082b23] via-[#0d3b30] to-[#171c19] text-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 text-emerald-50/80 hover:bg-white/10 hover:text-white"
              onClick={() => navigate(`/projects/${projectId}?tab=overview`)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to project
            </Button>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
              <Sparkles className="h-4 w-4" /> Project workspace
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Documents</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/75 sm:text-base">
              {isLoading ? "Loading project…" : project?.name || "Project"} | Write with AI, paste and format content, save versions, create a polished PDF, and email it to the client.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[360px]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <FileText className="mb-2 h-4 w-4 text-amber-300" />
              <p className="font-semibold">Living documents</p>
              <p className="mt-0.5 text-emerald-50/65">Draft, edit, approve, and send</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <Brain className="mb-2 h-4 w-4 text-amber-300" />
              <p className="font-semibold">Source records</p>
              <p className="mt-0.5 text-emerald-50/65">Store and search project files</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={changeView} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl p-1 sm:w-[480px]">
          <TabsTrigger value="studio" className="gap-2 rounded-lg py-2.5">
            <FileText className="h-4 w-4" /> Document Studio
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2 rounded-lg py-2.5">
            <FolderArchive className="h-4 w-4" /> File Repository
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="mt-0">
          <DocumentWorkspace projectId={projectId} projectName={project?.name} />
        </TabsContent>
        <TabsContent value="files" className="mt-0">
          <RepositoryTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
