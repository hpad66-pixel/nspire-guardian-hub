import { useCostCodeLibraries } from "@/hooks/useCostCodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function CostCodeLibrariesPage() {
  const { data: libs = [], isLoading, seedCsi } = useCostCodeLibraries();

  async function handleSeed() {
    try {
      await seedCsi.mutateAsync();
      toast.success("CSI MasterFormat library seeded");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cost Code Libraries</h1>
          <p className="text-muted-foreground mt-1">
            Every financial module uses codes from your default library.
          </p>
        </div>
        {libs.length === 0 && (
          <Button onClick={handleSeed} disabled={seedCsi.isPending}>
            Seed CSI MasterFormat
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : libs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No libraries yet. Click "Seed CSI MasterFormat" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {libs.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    <Link to={`/admin/cost-codes/${l.id}`} className="hover:underline">
                      {l.name}
                    </Link>
                  </CardTitle>
                  {l.is_default && <Badge>Default</Badge>}
                  <Badge variant="outline">{l.source}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Updated {new Date(l.updated_at).toLocaleDateString()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
