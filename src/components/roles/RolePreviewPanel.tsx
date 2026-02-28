import { useRolePreview } from '@/hooks/useRolePreview';
import { CheckCircle, X, Check } from 'lucide-react';

interface Props {
  roleKey: string;
}

export function RolePreviewPanel({ roleKey }: Props) {
  const { permissionMatrix, MODULE_LABELS } = useRolePreview(roleKey);

  const canModules = permissionMatrix.filter(m => m.view).map(m => m.label);
  const cannotModules = permissionMatrix.filter(m => !m.view).map(m => m.label);

  return (
    <div className="space-y-6">
      {/* Section 1 — Simulated Sidebar */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Visible Navigation
        </h4>
        <div className="space-y-1">
          {permissionMatrix.map(m => (
            <div
              key={m.module}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] ${
                m.view
                  ? 'text-foreground'
                  : 'text-muted-foreground/50 line-through'
              }`}
            >
              {m.view ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
              )}
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — Permission Table */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Permission Matrix
        </h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[hsl(var(--muted))]">
                <th className="text-left py-2 px-2 font-medium w-[160px]">Module</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">View</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">Create</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">Edit</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">Delete</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">Approve</th>
                <th className="text-center py-2 px-1 font-medium w-[44px]">Assign</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((m, i) => (
                <tr key={m.module} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <td className="py-1.5 px-2 font-medium text-foreground">{m.label}</td>
                  {(['view', 'create', 'update', 'delete', 'approve', 'assign'] as const).map(action => (
                    <td key={action} className="text-center py-1.5 px-1">
                      {m[action] && <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 — Plain English Summary */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Access Summary
        </h4>
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          {canModules.length > 0 && (
            <>This role can access: {canModules.join(', ')}. </>
          )}
          {cannotModules.length > 0 && (
            <>They cannot access: {cannotModules.join(', ')}.</>
          )}
          {canModules.length === 0 && 'This role has no view permissions.'}
        </p>
      </div>
    </div>
  );
}
