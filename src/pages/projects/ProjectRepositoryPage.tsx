import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectArtifacts, type ArtifactType, type ArtifactSource, type ProjectArtifact } from "@/hooks/useProjectArtifacts";
import { ArtifactUploadDialog } from "@/components/repository/ArtifactUploadDialog";
import { ArtifactViewer } from "@/components/repository/ArtifactViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload, Search, FileText, Image as ImageIcon, FileArchive,
  MoreVertical, Trash2, Brain, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const TYPE_LABELS: Record<ArtifactType, string> = {
  prime_contract: "Prime Contract", invoice: "Invoice", change_order: "Change Order",
  drawing: "Drawing", permit: "Permit", inspection_record: "Inspection Record",
  photo: "Photo", specification: "Specification", correspondence: "Correspondence", other: "Other",
};

const TYPE_ICONS: Record<ArtifactType, React.ReactNode> = {
  prime_contract: <FileText className="h-5 w-5 text-blue-500" />,
  invoice: <FileText className="h-5 w-5 text-green-500" />,
  change_order: <FileText className="h-5 w-5 text-amber-500" />,
  drawing: <FileArchive className="h-5 w-5 text-purple-500" />,
  permit: <FileText className="h-5 w-5 text-teal-500" />,
  inspection_record: <FileText className="h-5 w-5 text-rose-500" />,
  photo: <ImageIcon className="h-5 w-5 text-pink-500" />,
  specification: <FileText className="h-5 w-5 text-indigo-500" />,
  correspondence: <FileText className="h-5 w-5 text-gray-500" />,
  other: <FileText className="h-5 w-5 text-muted-foreground" />,
};

const SOURCE_STYLE: Record<ArtifactSource, string> = {
  procore:  "bg-orange-100 text-orange-800 border-orange-200",
  builtos:  "bg-blue-100 text-blue-800 border-blue-200",
  manual:   "bg-gray-100 text-gray-700 border-gray-200",
};
const SOURCE_LABEL: Record<ArtifactSource, string> = {
  procore: "Procore", builtos: "Proj OS", manual: "Manual",
};

function fmt(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectRepositoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState<ArtifactSource>("manual");
  const [viewing, setViewing] = useState<ProjectArtifact | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ArtifactType | "all">("all");
  const [filterSource, setFilterSource] = useState<ArtifactSource | "all">("all");

  const { data: artifacts = [], isLoading, remove } = useProjectArtifacts(projectId ?? null);

  const filtered = artifacts.filter((a) => {
    if (filterType !== "all" && a.artifact_type !== filterType) return false;
    if (filterSource !== "all" && a.source_system !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.reference_no ?? "").toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q))
      );
    }
    return true;
  });

  // Summary counts
  const procoreCount = artifacts.filter((a) => a.source_system === "procore").length;
  const typeGroups = artifacts.reduce((acc, a) => {
    acc[a.artifact_type] = (acc[a.artifact_type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  async function handleDelete(a: ProjectArtifact) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(a);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function openUpload(source: ArtifactSource) {
    setUploadSource(source);
    setUploadOpen(true);
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-[var(--apas-sapphire)]" />
            Project Repository
          </h1>
          <p className="text-muted-foreground mt-1">
            Historical artifacts, imported documents, and AI-queryable knowledge base.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openUpload("procore")}>
            <Upload className="h-4 w-4 mr-2" />
            Import from Procore
          </Button>
          <Button onClick={() => openUpload("manual")}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {artifacts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Artifacts</p>
              <p className="text-2xl font-bold">{artifacts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">From Procore</p>
              <p className="text-2xl font-bold text-orange-600">{procoreCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoices</p>
              <p className="text-2xl font-bold text-green-600">{typeGroups["invoice"] ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Change Orders</p>
              <p className="text-2xl font-bold text-amber-600">{typeGroups["change_order"] ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, reference #, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ArtifactType | "all")}>
          <SelectTrigger className="w-44">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={(v) => setFilterSource(v as ArtifactSource | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="procore">Procore (historical)</SelectItem>
            <SelectItem value="builtos">Proj OS</SelectItem>
            <SelectItem value="manual">Manual upload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Artifact list */}
      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Loading repository…</div>
      ) : artifacts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium text-lg">Repository is empty</p>
              <p className="text-muted-foreground text-sm mt-1">
                Upload historical Procore documents — invoices, change orders, the prime contract,
                drawings, permits, inspection records — to build your project knowledge base.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => openUpload("procore")}>
                <Upload className="h-4 w-4 mr-2" /> Import from Procore
              </Button>
              <Button onClick={() => openUpload("manual")}>
                <Upload className="h-4 w-4 mr-2" /> Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No artifacts match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition"
              onClick={() => setViewing(a)}
            >
              <div className="shrink-0">{TYPE_ICONS[a.artifact_type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">{a.title}</span>
                  {a.reference_no && (
                    <Badge variant="outline" className="font-mono text-xs shrink-0">{a.reference_no}</Badge>
                  )}
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${SOURCE_STYLE[a.source_system]} shrink-0`}>
                    {SOURCE_LABEL[a.source_system]}
                  </span>
                  {a.extracted_text && (
                    <Brain className="h-3.5 w-3.5 text-[var(--apas-sapphire)] shrink-0" title="AI-indexed" />
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{TYPE_LABELS[a.artifact_type]}</span>
                  {a.period_date && <span>{a.period_date}</span>}
                  {a.amount != null && <span className="font-mono text-foreground">{fmt(a.amount)}</span>}
                  <span>{fmtSize(a.file_size)}</span>
                  <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
                {a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs py-0">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewing(a); }}>
                    <FileText className="h-4 w-4 mr-2" /> View / Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <ArtifactUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId!}
        defaultSource={uploadSource}
      />
      <ArtifactViewer artifact={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
