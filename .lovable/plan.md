
# APAS OS — Complete Tier 2 & Tier 3 Execution Plan

## Current Status Assessment

### Tier 1 (Core PWA) — DONE
`manifest.webmanifest`, branded icons, offline page, `PWAInstallBanner`, `PWAUpdateBanner`, iOS meta tags, service worker caching — all complete.

### Tier 2 (Mobile UX) — ~30% done
Only `WorkOrdersPage` was converted to mobile cards. All other pages still use desktop-first layouts with overflowing tables and headers.

### Tier 3 (Enterprise Features) — 0% done
Push notifications, realtime notification delivery, and an `/install` guide page are not built.

### Tier 4 (Performance) — DONE
Bundle splitting and dynamic imports are complete. Build passes.

---

## Tier 2 — Mobile Responsiveness (All Remaining Pages)

The approach across every page: **stack-on-mobile, table-on-desktop** — no horizontal scrolling, touch targets >= 44px, filter rows wrap on small screens.

### Pages to fix (7 remaining):

**1. `Dashboard.tsx`**
- Header: responsive flex-wrap, property selector collapses on mobile
- Module cards: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- My Tasks: tighten spacing, hide low-priority columns on mobile

**2. `IssuesPage.tsx`**
- Header buttons: overflow into a row that wraps and stacks on mobile
- Stats cards: `grid-cols-2 md:grid-cols-4`
- Issue rows: on mobile, collapse into card-style layout (severity + title top row, property + badges bottom row), hide area badge

**3. `InspectionsDashboard.tsx`**
- Header: `flex-col sm:flex-row` for title + button
- Stats grid: `grid-cols-2 md:grid-cols-4`
- Annual Progress card: area breakdown goes `grid-cols-1 md:grid-cols-3`
- Defects list rows: collapse into stacked card layout on mobile

**4. `ProjectsDashboard.tsx`**
- Header: already partially wrapped, ensure button doesn't clip
- Stats: `grid-cols-2 lg:grid-cols-4`
- Control row: search full width on mobile, selects wrap below it
- Project cards: already cards — just ensure they stack `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- Health strip: horizontal scroll on very small screens

**5. `PeoplePage.tsx`**
- Header buttons wrap on mobile
- Filters column: full-width search, selects go `flex-wrap`
- `PeopleTable` component: convert to card layout on `< md` via `useIsMobile` hook (already exists)

**6. `PermitsDashboard.tsx`**
- Header: flex-wrap
- Filter row: wraps below search on mobile
- `PermitCard` items: already card-based — verify padding and text don't overflow

**7. `ReportsPage.tsx`**
- Date range preset buttons: horizontal scroll or wrap on mobile
- Report category cards: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Tab pills: scrollable on mobile

**8. `OccupancyPage.tsx` and `PropertiesPage.tsx`**
- Both use table or card layouts — ensure `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` responsive grids

---

## Tier 3 — Enterprise Features

### 3A: Web Push Notifications (Browser-native, works on Android + desktop; iOS 16.4+ PWA)

**Database**
- New migration to create `push_subscriptions` table:
  ```sql
  CREATE TABLE push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
  -- Users can only manage their own subscriptions
  CREATE POLICY "own_subs" ON push_subscriptions
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ```

**Edge Function: `send-push-notification`**
- Accepts `{ user_id, title, body, url }` payload
- Fetches all subscriptions for the given user_id
- Uses Web Push Protocol (VAPID) to dispatch push to each endpoint
- Needs `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` secrets (generated once, stored in secrets)
- Falls back gracefully if no subscription exists

**Frontend Hook: `usePushNotifications.ts`**
- `subscribe()`: calls `Notification.requestPermission()`, then `serviceWorker.pushManager.subscribe()`, then saves the subscription to the `push_subscriptions` table
- `unsubscribe()`: removes from DB
- `isSupported`: boolean check for browser capability
- `permission`: current state (`'default'` | `'granted'` | `'denied'`)

**Service Worker additions in `vite.config.ts`**
- Add `push` event listener in the SW via Workbox's `injectManifest` mode OR via a custom `sw.js` that handles push events and shows `self.registration.showNotification()`

**UI: `NotificationPermissionBanner`**
- Displayed once in `AppLayout` (below header) for users who haven't been asked
- "Enable Notifications" button → calls `subscribe()`
- Shows on Android Chrome and Desktop; hidden on iOS (push requires iOS 16.4+ Safari and the app must be added to home screen)

**Integration points** — existing notifications already written to the `notifications` table by DB triggers (mentions, messages, deadlines). We add a call to the push edge function from those same triggers.

### 3B: Offline Form Submission Queue (IndexedDB)

This allows field staff (inspectors) to submit daily inspection items and work order notes without connectivity.

**`src/lib/offlineQueue.ts`**
- Opens an IndexedDB store called `apas-offline-queue`
- `enqueue(action)`: saves `{ type, payload, timestamp }` to IDB
- `flush()`: processes all queued items when `navigator.onLine` fires `true`
- Listens to `window.addEventListener('online', flush)`

**Integration points**
- `DailyInspectionWizard.tsx`: wrap submit mutation with `try { await mutate() } catch { enqueue({type:'daily_inspection', payload}) }`
- `WorkOrderDetailSheet.tsx`: same pattern for status updates made offline
- Show a small amber "Offline — changes queued" toast/banner when device is offline

### 3C: `/install` Guide Page (PWA How-To)

A dedicated `/install` route (public-accessible, no auth required) that shows:
- Step-by-step Android Chrome installation with animated screenshots
- Step-by-step iOS Safari "Add to Home Screen" instructions
- QR code linking to the app for desktop users to scan
- "Already Installed? Open App →" CTA

This page will be linked from:
- `PWAInstallBanner` (iOS step text becomes a link)
- The public landing page (`LandingPage.tsx`) via a "Download App" button

---

## Implementation Order

```text
Step 1  — DB migration: push_subscriptions table + RLS
Step 2  — Edge Function: send-push-notification (VAPID)
Step 3  — Hook: usePushNotifications.ts
Step 4  — UI: NotificationPermissionBanner + wire into AppLayout
Step 5  — Service Worker: push event handler (custom sw.js)
Step 6  — Offline Queue: src/lib/offlineQueue.ts
Step 7  — Wire offline queue into DailyInspectionWizard + WorkOrders
Step 8  — /install page (with QR code, iOS + Android steps)
Step 9  — Tier 2 mobile: Dashboard, Issues, Inspections, Projects, People, Permits, Reports, Occupancy, Properties (all pages)
Step 10 — Link /install from LandingPage + PWAInstallBanner
```

## Technical Notes

- VAPID key pair generation: handled inside the edge function on first run (or pre-generated and stored as secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`). The public key must also be embedded in the frontend for `pushManager.subscribe({ applicationServerKey })`.
- The existing `notifications` table + in-app `NotificationCenter` is untouched. Push is a parallel delivery channel that supplements it.
- The offline queue uses IndexedDB (not localStorage) because it can store larger structured data and survives browser restarts.
- All Tier 2 mobile fixes use Tailwind responsive prefixes only — no new dependencies needed.
- The `/install` page uses the existing `QRCodeGenerator` component already in the codebase (`src/components/qr/QRCodeGenerator.tsx`).
- `useIsMobile` hook already exists at `src/hooks/use-mobile.tsx` — used for conditional rendering inside table-heavy pages.
