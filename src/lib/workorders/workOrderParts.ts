/**
 * Work-order parts helpers — before/after photo gate + install readiness.
 */

export type WorkOrderPartStatus = 'assigned' | 'installed' | 'cancelled';

export interface WorkOrderPartLike {
  id: string;
  status: WorkOrderPartStatus | string;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  quantity?: number | null;
  inventory_item?: { name?: string | null; sku?: string | null; photo_url?: string | null } | null;
}

export function hasBeforePhoto(part: WorkOrderPartLike): boolean {
  return Boolean(part.before_photo_url?.trim());
}

export function hasAfterPhoto(part: WorkOrderPartLike): boolean {
  return Boolean(part.after_photo_url?.trim());
}

export function partPhotosComplete(part: WorkOrderPartLike): boolean {
  return hasBeforePhoto(part) && hasAfterPhoto(part);
}

export function canMarkPartInstalled(part: WorkOrderPartLike): boolean {
  return part.status === 'assigned' && partPhotosComplete(part);
}

export function pendingPartsCount(parts: WorkOrderPartLike[]): number {
  return parts.filter((p) => p.status === 'assigned').length;
}

export function installedPartsCount(parts: WorkOrderPartLike[]): number {
  return parts.filter((p) => p.status === 'installed').length;
}

/** True when every non-cancelled part is installed with both photos (or there are no parts). */
export function workOrderPartsReadyToComplete(parts: WorkOrderPartLike[]): boolean {
  const active = parts.filter((p) => p.status !== 'cancelled');
  if (active.length === 0) return true;
  return active.every((p) => p.status === 'installed' && partPhotosComplete(p));
}

export function partsCompletionBlocker(parts: WorkOrderPartLike[]): string | null {
  const active = parts.filter((p) => p.status !== 'cancelled');
  if (active.length === 0) return null;
  const awaiting = active.filter((p) => p.status === 'assigned');
  if (awaiting.length > 0) {
    const missingPhotos = awaiting.filter((p) => !partPhotosComplete(p)).length;
    if (missingPhotos > 0) {
      return `${awaiting.length} part(s) need before + after photos and install confirmation before you can close this work order.`;
    }
    return `${awaiting.length} part(s) still need to be marked Installed before you can close this work order.`;
  }
  const badInstalled = active.filter((p) => p.status === 'installed' && !partPhotosComplete(p));
  if (badInstalled.length > 0) {
    return `${badInstalled.length} installed part(s) are missing before/after photos.`;
  }
  return null;
}
