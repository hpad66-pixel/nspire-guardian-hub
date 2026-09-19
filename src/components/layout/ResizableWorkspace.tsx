import { Children, type ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useBreakpoint } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResizableWorkspaceProps {
  children: ReactNode;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  defaultPrimarySize?: number;
  defaultSecondarySize?: number;
  minPrimarySize?: number;
  minSecondarySize?: number;
  storageId?: string;
}

export function ResizableWorkspace({
  children,
  className,
  primaryClassName,
  secondaryClassName,
  defaultPrimarySize = 58,
  defaultSecondarySize = 42,
  minPrimarySize = 32,
  minSecondarySize = 28,
  storageId,
}: ResizableWorkspaceProps) {
  const breakpoint = useBreakpoint();
  const panes = Children.toArray(children).filter(Boolean);
  const [primary, secondary] = panes;

  if (!secondary || breakpoint !== "desktop") {
    return (
      <div className={cn("grid gap-5", className)}>
        {panes.map((pane, index) => (
          <div
            key={index === 0 ? "primary" : `secondary-${index}`}
            className={index === 0 ? primaryClassName : secondaryClassName}
          >
            {pane}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId={storageId}
      className={cn("min-h-[680px] w-full", className)}
    >
      <ResizablePanel defaultSize={defaultPrimarySize} minSize={minPrimarySize} className={cn("min-w-0 pr-4", primaryClassName)}>
        {primary}
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-border/80" />
      <ResizablePanel defaultSize={defaultSecondarySize} minSize={minSecondarySize} className={cn("min-w-0 pl-4", secondaryClassName)}>
        {secondary}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
