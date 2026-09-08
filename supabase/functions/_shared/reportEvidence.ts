export interface EvidenceSource {
  id: string;
  included: boolean;
  mime_type: string | null;
  placement_mode?: string;
  visual_analysis?: { score?: number; group?: string; summary?: string; reason?: string };
}

/** Mandatory evidence is retained independently of the optional-photo allowance. */
export function chooseReportPhotos<T extends EvidenceSource>(sources: T[], limit = 8): T[] {
  const mandatory = sources.filter(s => s.placement_mode === 'mandatory');
  const candidates = sources.filter(s => s.included && s.placement_mode !== 'mandatory' &&
    s.mime_type?.startsWith('image/') && Number(s.visual_analysis?.score ?? 0) > 0)
    .sort((a, b) => Number(b.visual_analysis?.score) - Number(a.visual_analysis?.score) || a.id.localeCompare(b.id));
  const selected: T[] = [];
  const groups = new Set<string>();
  for (const candidate of candidates) {
    const group = candidate.visual_analysis?.group?.toLowerCase().trim() || 'general';
    if (!groups.has(group) && selected.length < limit) {
      groups.add(group);
      selected.push(candidate);
    }
  }
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return [...mandatory, ...selected];
}
