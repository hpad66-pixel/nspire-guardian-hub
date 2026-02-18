
# Enterprise Navigation & Layout Overhaul

## Diagnosis: What Is Broken and Why

### Problem 1 — Horizontal Scrolling on the Project Page
The `ProjectDetailPage` renders as a flex row: `[main content flex-1] + [ActivityFeedPanel 380px] + [DiscussionPanel 380px]`. When a panel opens, the 380px panel is added as a sibling that pushes `flex-1` content leftward — but there is no room because the outer container is `overflow-hidden`. The result is that the main content shrinks and the page scrolls horizontally.

**Fix**: Convert the Activity and Discussion panels from flex siblings into **absolute/fixed overlay drawers** that sit on top of the content using `position: absolute right-0` within the already-bounded content container. They should NOT push the content — they should overlay it. Alternatively, the panels can be rendered as right-edge sheets using Radix `Sheet`. This is the correct enterprise UX pattern (used by Linear, Jira, Notion).

### Problem 2 — Sidebar UX Issues
The sidebar already uses `collapsible="icon"` which is the correct shadcn pattern. The ghost spacer div correctly reserves layout space. However:
- When expanded, the sidebar has many nav groups open simultaneously causing overflow — the `SidebarContent` has `overflow-y-auto` but the visible area is correct. This is actually the primary scroll problem: too many groups are `defaultOpen={true}` at once.
- The sidebar `SidebarContent` height can be improved with better scrollbar styling.
- No visual "resize handle" or persistent expand/collapse state preference for the user.

**Fix**: 
- Collapse most groups by default — only the active group auto-opens
- Add smooth CSS transitions to collapsible groups
- Persist sidebar state to localStorage (the Shadcn SidebarProvider already uses a cookie — we will reinforce this)
- Add a subtle collapse/expand rail to the sidebar edge

### Problem 3 — Header Bar
The top header bar at `h-14` is solid but the search bar uses a fixed `w-64` which looks misaligned at some breakpoints.

---

## Changes Required

### File 1: `src/pages/projects/ProjectDetailPage.tsx`

**Change the panel rendering strategy completely:**

Currently:
```tsx
<div className="flex h-[calc(100vh-4rem)] overflow-hidden">
  <div className="flex-1 overflow-auto">
    {/* main content */}
  </div>
  <AnimatePresence>
    {activityFeedOpen && <ActivityFeedPanel ... />}
    {discussionsPanelOpen && <DiscussionPanel ... />}
  </AnimatePresence>
</div>
```

The `ActivityFeedPanel` and `DiscussionPanel` are siblings in the flex row and push content sideways. The fix is to make the outer container `relative` and the panels `absolute right-0 top-0 h-full` — so they overlay the content without pushing it.

New structure:
```tsx
<div className="relative h-[calc(100vh-3.5rem)] overflow-hidden flex">
  <div className="flex-1 overflow-auto min-w-0">
    {/* all main content */}
  </div>
  
  {/* Overlay panels — positioned absolute, slide in from right */}
  <AnimatePresence>
    {activityFeedOpen && (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="absolute right-0 top-0 h-full w-[380px] border-l shadow-xl z-20 bg-background"
      >
        <ActivityFeedPanel ... />
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

This way the panels slide over the content, not push it — exactly like Linear, GitHub's PR sidebar, or Jira's detail panel.

### File 2: `src/components/projects/ActivityFeedPanel.tsx`

**Remove the outer `motion.div` wrapper** — the motion is now handled by the parent in `ProjectDetailPage`. The panel itself should be a plain `div className="flex flex-col h-full"`. This avoids double-animation and keeps the component clean.

### File 3: `src/components/projects/DiscussionPanel.tsx`

**Same change** — remove the outer `motion.div`/animation wrapper from the panel itself. Motion is handled by the parent overlay container.

### File 4: `src/components/layout/AppSidebar.tsx`

**Key UX improvements:**

1. **Fix defaultOpen for groups** — Currently "Daily Grounds", "Projects", and "NSPIRE" all have `defaultOpen={true}`. When all three are active modules, the sidebar shows 10+ items expanded at once. Only the **currently active group** should be open by default, all others closed.

   Change: Remove `defaultOpen={true}` from all groups except when they are the active route. Each `CollapsibleNavGroup` already receives `isActive` — use that to drive the initial open state exclusively.

2. **Better mini-mode icons** — In icon-only/collapsed mode, wrap each `NavItem` in a `Tooltip` showing the label. This already exists via the `tooltip` prop but it's not applied consistently. Ensure ALL `NavItem` calls in collapsed mode show tooltips.

3. **Smooth group animations** — The Radix `CollapsibleContent` already animates, but we need to ensure the CSS `overflow-hidden` + `animate-accordion-down/up` classes are applied (from the existing index.css `tailwindcss-animate` config).

4. **Sidebar toggle persistence** — The shadcn `SidebarProvider` already saves state to a cookie (`sidebar:state`). Ensure the `defaultOpen` prop reads from that cookie on mount so the sidebar remembers whether the user left it collapsed or expanded.

5. **Add a `SidebarRail`** — The shadcn `SidebarRail` component provides a thin, hoverable strip on the edge of the sidebar that lets users click to expand/collapse. Add `<SidebarRail />` inside `<Sidebar>` for a more polished feel.

6. **Logo text fix** — Change "PM APAS" to "APAS Consulting" and remove the "Property OS" subtitle, matching the brand standard established in meeting minutes.

### File 5: `src/components/layout/AppLayout.tsx`

**Header improvements:**

1. Make the search bar `flex-1 max-w-sm` instead of a fixed `w-64` so it breathes on different viewports.
2. Move the `SidebarTrigger` to be visually integrated with the sidebar — add a hover state that clearly communicates "click to toggle."
3. Add a keyboard shortcut hint `⌘B` next to the sidebar trigger (the shadcn default is Ctrl/Cmd+B).

---

## Summary of UX Changes

| Issue | Root Cause | Fix |
|---|---|---|
| Content scrolls horizontally when panel opens | Activity/Discussion panels are flex siblings, pushing content | Convert panels to `position: absolute` overlays on the right edge |
| Sidebar shows too many expanded groups | All groups have `defaultOpen={true}` | Only auto-open the group containing the current route |
| Sidebar mini-mode has no tooltips for all items | `tooltip` prop not applied to all `NavItem` calls | Apply tooltip to every item when `collapsed` is true |
| Brand name wrong in sidebar | Shows "PM APAS / Property OS" | Change to "APAS Consulting" |
| No rail for resizing/toggling | `SidebarRail` not used | Add `<SidebarRail />` inside `Sidebar` |
| Header search bar fixed width | `w-64` class | Change to `flex-1 max-w-sm` |

---

## Technical Notes

- No new dependencies needed — all changes are structural Tailwind/React refactors
- The `motion.div` wrappers are moved UP to the parent (`ProjectDetailPage`) so the panel components themselves become simpler
- The Radix `Sheet` component could also be used for the overlay panels, but `motion.div` + `absolute` is simpler here and avoids adding a Radix portal which would require z-index management against the sidebar
- The sidebar `SidebarRail` is already exported from `@/components/ui/sidebar` — it just needs to be used
- Cookie-based sidebar state persistence is already built into `SidebarProvider` — no extra work needed
