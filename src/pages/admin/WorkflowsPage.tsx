/**
 * A4 · WorkflowsPage — admin surface that hosts the module-level
 * WorkflowEditor. Route: /admin/workflows
 */
import { WorkflowEditor } from "@/components/admin/WorkflowEditor";

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflows</h1>
        <p className="text-muted-foreground mt-1">
          Configure Ball-in-Court step sequences per module. Each definition is
          versioned — the "default" version is what new records use.
        </p>
      </div>
      <WorkflowEditor />
    </div>
  );
}
