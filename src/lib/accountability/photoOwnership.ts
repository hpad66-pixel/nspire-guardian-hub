export function canEditFieldPhotoCaption(
  uploaderId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(uploaderId && currentUserId && uploaderId === currentUserId);
}
