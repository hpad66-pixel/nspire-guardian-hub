/**
 * A2 · Permissions — canonical import path for `can()` / `requireCan()`.
 *
 * The Procore Lite prompts import the permission helper from this path. The
 * actual RPC wiring lives in `src/lib/rbac/index.ts`; this module is a thin
 * re-export so import sites stay stable across future rbac refactors.
 *
 *   import { can, requireCan, ForbiddenError } from "@/lib/permissions";
 *
 * Do not add behavior here — extend `src/lib/rbac/` instead.
 */
export {
  can,
  permissionLevel,
  requireCan,
  ForbiddenError,
} from "@/lib/rbac";
export type {
  PermissionLevel,
  Module,
  Action,
  PermissionCheckInput,
} from "@/lib/rbac";
