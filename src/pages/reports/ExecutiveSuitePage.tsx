import { useState } from "react";
import { ExecutiveDashboardPanel } from "@/components/executive/ExecutiveDashboardPanel";
import { ExecutivePresentationMode } from "@/components/executive/ExecutivePresentationMode";

export default function ExecutiveSuitePage() {
  const [mode, setMode] = useState<"dashboard" | "presentation">("dashboard");

  return (
    <>
      {mode === "dashboard" && (
        <ExecutiveDashboardPanel onStartPresentation={() => setMode("presentation")} />
      )}
      {mode === "presentation" && (
        <ExecutivePresentationMode onExit={() => setMode("dashboard")} />
      )}
    </>
  );
}
