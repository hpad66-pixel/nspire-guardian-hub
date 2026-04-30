/**
 * A4 · Workflow engine — canonical import path for the Ball-in-Court service.
 *
 * Procore Lite prompts call for the engine at `@/lib/workflow-engine`; the
 * Supabase-backed implementation lives in `src/lib/workflow/index.ts`. This
 * module re-exports the public surface so every module imports from the same
 * path the prompts specify.
 *
 *   import {
 *     createWorkflowInstance, advanceWorkflow, getInstanceForRecord,
 *   } from "@/lib/workflow-engine";
 *
 * Do not add behavior here — extend `src/lib/workflow/` instead.
 */
export {
  createWorkflowInstance,
  advanceWorkflow,
  getInstanceForRecord,
} from "@/lib/workflow";
export type {
  WorkflowModule,
  WorkflowAction,
  WorkflowState,
  WorkflowInstance,
} from "@/lib/workflow";
