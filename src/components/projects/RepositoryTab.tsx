import { useState } from "react";
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
  procore: "bg-orange-100 text-orange-800 border-orange-200",
  builtos: "bg-blue-100 text-blue-800 border-blue-200",
  manual:  "bg-gray-100 text-gray-700 border-gray-200",
};
const SOURCE_LABEL: Record<ArtifactSource, string> = {
  procore: "Procore", builtos: "Build OS", manual: "Manual",
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

export function RepositoryTab({ projectId }: { projectId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState<ArtifactSource>("manual");
  const [viewing, setViewing] = useState<ProjectArtifact | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ArtifactType | "all">("all");
  const [filterSource, setFilterSource] = useState<ArtifactSource | "all">("all");

  const { data: artifacts = [], isLoading, remove } = useProjectArtifacts(projectId);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Project Repository
          </h2>
          <p className="text-muted-foreground text-sm">
            Historical artifacts · AI-queryable knowledge base
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setUploadSource("procore"); setUploadOpen(true); }}>
            <Upload className="h-4 w-4 mr-1.5" /> Import from Procore
          </Button>
          <Button size="sm" onClick={() => { setUploadSource("manual"); setUploadOpen(true); }}>
            <Upload className="h-4 w-4 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      {/* Stats */}
      {artifacts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: artifacts.length, color: "" },
            { label: "From Procore", value: procoreCount, color: "text-orange-600" },
            { label: "Invoices", value: typeGroups["invoice"] ?? 0, color: "text-green-600" },
            { label: "Change Orders", value: typeGroups["change_order"] ?? 0, color: "text-amber-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search title, ref #, tag…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as ArtifactType | "all")}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
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
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="procore">Procore</SelectItem>
            <SelectItem value="builtos">Build OS</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Loading…</div>
      ) : artifacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium">Repository is empty</p>
              <p className="text-muted-foreground text-sm mt-1">
                Upload historical Procore documents — invoices, change orders, the prime contract,
                drawings, permits, and inspection records — to build your project knowledge base.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setUploadSource("procore"); setUploadOpen(true); }}>
                Import from Procore
              </Button>
              <Button size="sm" onClick={() => { setUploadSource("manual"); setUploadOpen(true); }}>
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">No artifacts match your filters.</p>
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{a.title}</span>
                  {a.reference_no && (
                    <Badge variant="outline" className="font-mono text-xs">{a.reference_no}</Badge>
                  )}
                  <span className={`inline-flex px-1.5 py-0 rounded text-xs font-medium border ${SOURCE_STYLE[a.source_system]}`}>
                    {SOURCE_LABEL[a.source_system]}
                  </span>
                  {a.extracted_text && (
                    <Brain className="h-3 w-3 text-[var(--apas-sapphire)]" title="AI-indexed" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
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
                  <DropdownMenuItem className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(a); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <ArtifactUploadDialog open={uploadOpen} onOpenChange={setUploadOpen}
        projectId={projectId} defaultSource={uploadSource} />
      <ArtifactViewer artifact={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
