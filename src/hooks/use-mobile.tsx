import * as React from "react";

/** Phone breakpoint — matches Tailwind `md` (768px). */
export const MOBILE_BREAKPOINT = 768;

/** Compact nav (bottom bar) — matches Tailwind `lg` (1024px). Sidebar shows at lg+. */
export const COMPACT_NAV_BREAKPOINT = 1024;

export type AppBreakpoint = "mobile" | "tablet" | "desktop";

function readBreakpoint(width: number): AppBreakpoint {
  if (width < MOBILE_BREAKPOINT) return "mobile";
  if (width < COMPACT_NAV_BREAKPOINT) return "tablet";
  return "desktop";
}

/** True when viewport is phone-sized (< 768px). */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** True when the bottom MobileNav should show (< 1024px). */
export function useIsCompactNav() {
  const [compact, setCompact] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < COMPACT_NAV_BREAKPOINT : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`);
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener("change", onChange);
    setCompact(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return compact;
}

/** Coarse breakpoint aligned to the app shell (mobile / tablet / desktop). */
export function useBreakpoint(): AppBreakpoint {
  const [bp, setBp] = React.useState<AppBreakpoint>(() =>
    typeof window !== "undefined" ? readBreakpoint(window.innerWidth) : "desktop",
  );

  React.useEffect(() => {
    const onResize = () => setBp(readBreakpoint(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}
