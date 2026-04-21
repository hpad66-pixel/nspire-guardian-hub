import { useParams, Link } from "react-router-dom";
import { usePermissionTemplates } from "@/hooks/usePermissionTemplates";
import { PermissionTemplateEditor } from "@/components/admin/PermissionTemplateEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PermissionTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: templates = [] } = usePermissionTemplates();
  const template = templates.find((t) => t.id === id);

  if (!id) return null;
  if (!template) {
    return <div className="container mx-auto p-6">Template not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/admin/permission-templates" className="text-sm text-muted-foreground hover:underline">
            ← Templates
          </Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            {template.name}
            {template.is_system && <Badge variant="secondary">System</Badge>}
          </h1>
          {template.description && (
            <p className="text-muted-foreground mt-1">{template.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link to={`/admin/permission-templates/${id}/assign`}>Assign to user</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionTemplateEditor templateId={id} readOnly={template.is_system} />
        </CardContent>
      </Card>
    </div>
  );
}
