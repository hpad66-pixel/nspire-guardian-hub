import type { FieldItem, FieldPhoto } from '@/hooks/useFieldAccountability';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function suggestionText(photo: FieldPhoto, key: string) {
  const value = photo.ai_suggestion?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string').join(' ');
  return '';
}

function fileLabel(photo: FieldPhoto) {
  const source = photo.photo.exif?.source_filename;
  if (typeof source === 'string' && source) return source;
  return photo.photo.storage_path.split('/').at(-1) || photo.photo_id;
}

export function photoObservation(photo: FieldPhoto) {
  return photo.reviewed_narrative
    || suggestionText(photo, 'observed')
    || suggestionText(photo, 'caption')
    || photo.photo.caption
    || 'No observation has been drafted.';
}

export function photoRecommendedAction(photo: FieldPhoto) {
  return photo.recommended_action
    || suggestionText(photo, 'clarification_questions')
    || 'Review this photograph and define the required action.';
}

export function photoCategory(photo: FieldPhoto) {
  return photo.reviewed_category || suggestionText(photo, 'category') || 'other';
}

export function photoSeverity(photo: FieldPhoto) {
  return photo.reviewed_severity || suggestionText(photo, 'severity') || 'medium';
}

export function buildFieldPhotoScopeReport({
  projectName,
  photos,
  items,
}: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
}) {
  const confirmed = photos.filter((photo) => photo.review_status === 'confirmed');
  const drafts = photos.filter((photo) => photo.review_status !== 'confirmed');
  const categories = new Map<string, FieldPhoto[]>();
  photos.forEach((photo) => {
    const category = photoCategory(photo);
    categories.set(category, [...(categories.get(category) ?? []), photo]);
  });
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const generatedAt = new Date();
  const rows = photos.map((photo) => {
    const item = photo.item_id ? itemMap.get(photo.item_id) : null;
    const confirmedRow = photo.review_status === 'confirmed';
    return `<tr>
      <td>${escapeHtml(fileLabel(photo))}</td>
      <td><span class="pill ${confirmedRow ? 'confirmed' : 'draft'}">${confirmedRow ? 'Confirmed' : 'AI draft / pending review'}</span></td>
      <td>${escapeHtml(photoCategory(photo).replace(/_/g, ' '))}<br><small>${escapeHtml(photoSeverity(photo))}</small></td>
      <td>${escapeHtml(photo.reviewed_location || item?.location_label || 'Location to verify')}</td>
      <td>${escapeHtml(photoObservation(photo))}</td>
      <td>${escapeHtml(photoRecommendedAction(photo))}</td>
      <td>${escapeHtml(item?.ball_in_court?.replace(/_/g, ' ') || 'Unassigned')}</td>
    </tr>`;
  }).join('');

  const categoryRows = [...categories.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, group]) => {
      const confirmedCount = group.filter((photo) => photo.review_status === 'confirmed').length;
      const high = group.filter((photo) => ['high', 'critical'].includes(photoSeverity(photo))).length;
      const actions = [...new Set(group.map(photoRecommendedAction))].slice(0, 4);
      return `<section class="scope"><div><h3>${escapeHtml(category.replace(/_/g, ' '))}</h3><p>${group.length} photo${group.length === 1 ? '' : 's'} · ${confirmedCount} confirmed · ${high} high/critical</p></div><ul>${actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}</ul></section>`;
    }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(projectName)} — Photo Scope Report</title><style>
    @page{size:landscape;margin:.45in}*{box-sizing:border-box}body{margin:0;color:#16342d;font:12px/1.45 Arial,sans-serif}header{border-radius:18px;background:#082b23;color:white;padding:28px;margin-bottom:18px}h1{font:700 28px Georgia,serif;margin:4px 0}h2{font:700 20px Georgia,serif;margin:22px 0 10px}h3{margin:0;text-transform:capitalize}.eyebrow{color:#e8c36b;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.stat{background:#fff1;border:1px solid #fff2;border-radius:12px;padding:12px}.stat b{display:block;font-size:22px}.notice{border:1px solid #e9c46a;background:#fff9e9;border-radius:12px;padding:12px;margin:12px 0}.scope{display:grid;grid-template-columns:240px 1fr;gap:20px;border:1px solid #ddd8cd;border-radius:12px;padding:12px;margin:8px 0;break-inside:avoid}.scope p{margin:4px 0;color:#68756f}.scope ul{margin:0;padding-left:18px}table{border-collapse:collapse;width:100%;font-size:9px}th,td{border:1px solid #ddd8cd;padding:6px;vertical-align:top}th{background:#edf4f1;text-align:left;text-transform:uppercase;letter-spacing:.06em}.pill{display:inline-block;border-radius:20px;padding:2px 5px;font-size:8px;font-weight:bold}.confirmed{background:#dff4e8;color:#14613f}.draft{background:#fff0c8;color:#75520a}small{color:#68756f;text-transform:capitalize}.footer{margin-top:12px;color:#68756f;font-size:9px}@media print{.no-print{display:none}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}}@media(max-width:800px){.stats{grid-template-columns:1fr 1fr}.scope{grid-template-columns:1fr}table{font-size:8px}}
  </style></head><body>
    <header><div class="eyebrow">Proj OS · Field Accountability</div><h1>${escapeHtml(projectName)}</h1><p>Property-wide photographic condition and preliminary scope report · ${escapeHtml(generatedAt.toLocaleString())}</p><div class="stats"><div class="stat"><b>${photos.length}</b>Photographs</div><div class="stat"><b>${confirmed.length}</b>Confirmed</div><div class="stat"><b>${drafts.length}</b>Draft / pending</div><div class="stat"><b>${categories.size}</b>Categories</div></div></header>
    <div class="notice"><strong>Evidence status:</strong> Confirmed rows contain an administrator-reviewed narrative. Draft rows contain AI-assisted starting language or an unreviewed uploader caption and must not be treated as a professional diagnosis, code finding, acceptance, or authorization to perform work.</div>
    <h2>Actionable scope by category</h2>${categoryRows || '<p>No photographs available.</p>'}
    <h2>Complete photographic register</h2><table><thead><tr><th>Photo</th><th>Evidence status</th><th>Category / severity</th><th>Location</th><th>Observed condition</th><th>Recommended action</th><th>Ball in court</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="footer">Generated from current Proj OS records. Original files, EXIF metadata, uploader captions, AI drafts, annotations, and review revisions remain separate in the audit record.</p>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))</script>
  </body></html>`;
}

export function openFieldPhotoScopeReport(input: Parameters<typeof buildFieldPhotoScopeReport>[0]) {
  const report = window.open('', '_blank');
  if (!report) throw new Error('Allow pop-ups to open the scope report.');
  report.opener = null;
  report.document.open();
  report.document.write(buildFieldPhotoScopeReport(input));
  report.document.close();
}
