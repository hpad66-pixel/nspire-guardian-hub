/**
 * flushOfflineQueue
 *
 * Registers the concrete flush handler against the offline queue and exposes
 * `flushOfflineQueue()` for use on app startup and on `online` events.
 *
 * This file is the ONLY place that knows about Supabase AND the queue — it
 * bridges the two without creating circular dependencies.
 */

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  registerFlushHandler,
  flush,
  getAll,
  type OfflineAction,
} from '@/lib/offlineQueue';

// ─────────────────────────────────────────────────────────────────────────────
// Concrete handler — one branch per action type
// ─────────────────────────────────────────────────────────────────────────────
async function executeAction(action: OfflineAction): Promise<void> {
  const { type, payload } = action;

  switch (type) {
    // ── Work order status update ──────────────────────────────────────────────
    case 'work_order_status': {
      const { id, status, notes, estimatedCost } = payload as {
        id: string;
        status: string;
        notes?: string;
        estimatedCost?: string;
      };

      const update: Record<string, unknown> = {
        status,
        submitted_at: new Date().toISOString(),
      };
      if (notes) update.notes = notes;
      if (estimatedCost) update.estimated_cost = parseFloat(estimatedCost);

      const { error } = await supabase
        .from('work_orders')
        .update(update)
        .eq('id', id);

      if (error) throw new Error(`work_order_status: ${error.message}`);
      break;
    }

    // ── Daily inspection submit ───────────────────────────────────────────────
    case 'daily_inspection': {
      const {
        propertyId,
        generalNotes,
        attachments,
        assetChecks,
      } = payload as {
        propertyId: string;
        generalNotes: string;
        attachments: string[];
        assetChecks: Array<{
          assetId: string;
          status: string;
          notes?: string;
          defectDescription?: string;
          photoUrls?: string[];
        }>;
      };

      // Insert the inspection header
      const { data: inspection, error: inspError } = await supabase
        .from('daily_inspections')
        .insert({
          property_id: propertyId,
          general_notes: generalNotes,
          attachments,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (inspError) throw new Error(`daily_inspection header: ${inspError.message}`);

      // Insert asset check items
      if (assetChecks?.length) {
        const items = assetChecks.map(c => ({
          daily_inspection_id: inspection.id,
          asset_id: c.assetId,
          // Map 'not_accessible' → 'needs_attention' to match DB enum
          status: (c.status === 'not_accessible' ? 'needs_attention' : c.status) as 'ok' | 'defect_found' | 'needs_attention',
          notes: c.notes ?? null,
          defect_description: c.defectDescription ?? null,
          photo_urls: c.photoUrls ?? [],
          checked_at: new Date().toISOString(),
        }));

        const { error: itemsError } = await supabase
          .from('daily_inspection_items')
          .insert(items);

        if (itemsError) throw new Error(`daily_inspection items: ${itemsError.message}`);
      }
      break;
    }

    // ── Inspection item update ────────────────────────────────────────────────
    case 'inspection_item': {
      const { id, status, notes, photoUrls, defectDescription } = payload as {
        id: string;
        status: 'ok' | 'defect_found' | 'needs_attention';
        notes?: string;
        photoUrls?: string[];
        defectDescription?: string;
      };

      const { error } = await supabase
        .from('daily_inspection_items')
        .update({
          status,
          notes: notes ?? null,
          photo_urls: photoUrls ?? [],
          defect_description: defectDescription ?? null,
          checked_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(`inspection_item: ${error.message}`);
      break;
    }

    default:
      console.warn(`[OfflineQueue] Unknown action type: ${type} — skipping`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public flush entry-point (used by App.tsx)
// ─────────────────────────────────────────────────────────────────────────────
let _registered = false;

function ensureRegistered() {
  if (_registered) return;
  registerFlushHandler(executeAction);
  _registered = true;
}

export async function flushOfflineQueue(showToast = true): Promise<void> {
  ensureRegistered();

  // Silently check if there's anything to do before toasting
  const pending = (await getAll()).filter(i => (i.status ?? 'pending') === 'pending');
  if (pending.length === 0) return;

  if (showToast) {
    toast.info(`Back online — syncing ${pending.length} queued change${pending.length !== 1 ? 's' : ''}…`, {
      id: 'offline-sync-start',
      duration: 4000,
    });
  }

  const result = await flush();

  if (!showToast) return;

  if (result.failed === 0 && result.synced > 0) {
    toast.success(
      result.synced === 1
        ? '1 change synced successfully'
        : `${result.synced} changes synced`,
      { id: 'offline-sync-done', duration: 4000 }
    );
  } else if (result.failed > 0) {
    const msg =
      result.synced > 0
        ? `${result.synced} synced, ${result.failed} failed — check Settings → Sync Issues`
        : `${result.failed} change${result.failed !== 1 ? 's' : ''} failed to sync — check Settings → Sync Issues`;
    toast.error(msg, { id: 'offline-sync-error', duration: 8000 });
  }
}

/** Register handler immediately so flush() works even before the React tree mounts. */
ensureRegistered();
