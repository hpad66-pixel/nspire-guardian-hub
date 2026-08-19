import { AlertTriangle, Flag, GitBranch, Megaphone, TrendingUp, type LucideIcon } from "lucide-react";
import type { ClientUpdateType } from "@/hooks/useClientUpdates";

export const UPDATE_TYPES: Record<ClientUpdateType, { label: string; eyebrow: string; icon: LucideIcon; accent: string; surface: string }> = {
  general: { label: "General note", eyebrow: "Project note", icon: Megaphone, accent: "text-slate-700", surface: "from-slate-50 to-white" },
  progress: { label: "Progress update", eyebrow: "Progress briefing", icon: TrendingUp, accent: "text-blue-700", surface: "from-blue-50 to-white" },
  milestone: { label: "Milestone", eyebrow: "Milestone reached", icon: Flag, accent: "text-amber-700", surface: "from-amber-50 to-white" },
  decision: { label: "Decision", eyebrow: "Decision briefing", icon: GitBranch, accent: "text-violet-700", surface: "from-violet-50 to-white" },
  risk: { label: "Risk / issue", eyebrow: "Risk briefing", icon: AlertTriangle, accent: "text-rose-700", surface: "from-rose-50 to-white" },
};
