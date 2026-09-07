import type { FieldItem, FieldPhoto, FieldSeverity } from '@/hooks/useFieldAccountability';
import {
  GLORIETA_SCOPE_TEMPLATES,
  type GlorietaScopeIssue,
  type ScopePriority,
} from '@/lib/accountability/glorietaPhotoScope';

function normalizeClientCopy(value: unknown) {
  return String(value ?? '').replace(/[—–‑]/g, '-');
}

function escapeHtml(value: unknown) {
  return normalizeClientCopy(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function suggestionText(photo: FieldPhoto, key: string) {
  const value = photo.ai_suggestion?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string').join(' ');
  return '';
}

export function photoFileLabel(photo: FieldPhoto) {
  const source = photo.photo.exif?.source_filename;
  if (typeof source === 'string' && source) return source;
  return photo.photo.storage_path.split('/').at(-1) || photo.photo_id;
}

function photoNumber(photo: FieldPhoto) {
  const match = photoFileLabel(photo).match(/IMG_(\d+)/i);
  return match ? Number(match[1]) : null;
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

export interface PhotoScopeGroup {
  key: string;
  sequence: number;
  title: string;
  priority: ScopePriority;
  photoRange: string;
  photos: FieldPhoto[];
  representativePhotos: FieldPhoto[];
  ownerSummary: string;
  contractorReadout: string;
  issues: GlorietaScopeIssue[];
  verification: string[];
  confirmedCount: number;
  highPriorityCount: number;
}

export type ScopeDiscipline =
  | 'Civil'
  | 'Electrical'
  | 'Plumbing'
  | 'Landscaping'
  | 'Stucco / Envelope'
  | 'Structural Engineering'
  | 'General Contractor';

export interface HudDeliveryPackage {
  key: string;
  title: string;
  lead: string;
  disciplines: ScopeDiscipline[];
  direction: string;
}

export const HUD_READINESS_DELIVERY_PACKAGES: HudDeliveryPackage[] = [
  {
    key: 'gc',
    title: 'General Contractor / HUD closeout',
    lead: 'General Contractor',
    disciplines: ['General Contractor'],
    direction: 'Retain one general contractor to control site safety, sequencing, access, schedules, licensed subcontractors, inspection punch lists and one complete closeout record.',
  },
  {
    key: 'civil-envelope',
    title: 'Combined stucco + civil restoration package',
    lead: 'General Contractor with licensed civil and stucco trades',
    disciplines: ['Civil', 'Stucco / Envelope'],
    direction: 'Carry the civil restoration and stucco/building-envelope work in one coordinated procurement package for pricing and scheduling. The general contractor must assign each activity to a properly licensed trade; bundling does not expand a stucco contractor’s license.',
  },
  {
    key: 'plumbing',
    title: 'Underground plumbing, backflow + irrigation',
    lead: 'Licensed plumbing / underground utility contractor',
    disciplines: ['Plumbing'],
    direction: 'Place backflow preventers, irrigation supply and repairs, below-grade piping, outlets, drains and related testing under the licensed underground plumbing package. Record permits, tests and inspection acceptance.',
  },
  {
    key: 'landscape',
    title: 'Landscape restoration',
    lead: 'Landscape contractor coordinated with plumbing and civil leads',
    disciplines: ['Landscaping'],
    direction: 'Include sod, planting, irrigation restoration, tree protection and establishment care as measured line items tied to the civil and plumbing disturbance limits so restoration is not left between trades.',
  },
  {
    key: 'electrical',
    title: 'Electrical, lighting + gate controls',
    lead: 'Licensed electrical / access-control contractor',
    disciplines: ['Electrical'],
    direction: 'Assign exterior lighting, exposed wiring or cabling, gate-control equipment, weatherproof enclosures and operational testing to a licensed electrical or qualified access-control contractor.',
  },
  {
    key: 'structural',
    title: 'Structural field verification',
    lead: 'Structural Engineer',
    disciplines: ['Structural Engineering'],
    direction: 'Retain a structural engineer to evaluate the wall and stucco conditions, open walk-edge voids, settlement, stairs and any suspected loss of support, then issue repair direction before concealed work is closed.',
  },
];

const DISCIPLINE_ORDER: ScopeDiscipline[] = [
  'Civil',
  'Electrical',
  'Plumbing',
  'Landscaping',
  'Stucco / Envelope',
  'Structural Engineering',
  'General Contractor',
];

export function classifyScopeIssue(issue: Pick<GlorietaScopeIssue, 'title' | 'observation' | 'scope'>): ScopeDiscipline[] {
  const text = `${issue.title} ${issue.observation} ${issue.scope}`.toLowerCase();
  const matches = new Set<ScopeDiscipline>();
  const addWhen = (discipline: ScopeDiscipline, pattern: RegExp) => { if (pattern.test(text)) matches.add(discipline); };

  addWhen('Civil', /\b(asphalt|pavement|concrete|walk|sidewalk|hardscape|curb|ramp|parking|bollard|wheel[ -]?stop|accessible|excavat|trench|grading|regrade|grade|backfill|settlement|utility cover|traffic island|striping|court|pad|stair|slab|compaction)\b/);
  addWhen('Electrical', /\b(electrical|lighting|light fixture|wall fixture|photocell|gate-control|access-control|cabling|wiring|lamp|energiz|utility cabinet)\b/);
  addWhen('Plumbing', /\b(plumb|drain|drainage|outlet|discharge|irrigation|backflow|water|ponding|inlet|downspout|sanitary|condensate|splash block|dewatering|flow-test)\b/);
  addWhen('Landscaping', /\b(turf|landscap|lawn|planting|plant|tree|root|sod|soil|hedge|mulch|groundcover|ground cover|arborist|vegetation)\b/);
  addWhen('Stucco / Envelope', /\b(stucco|wall|envelope|threshold|door|masonry|penetration|sealant|weather-tight|weather-rated|building base|building-base|finish band|lath|texture)\b/);
  addWhen('Structural Engineering', /\b(delamination|open void|undermin|settlement|differential movement|structural|foundation|panel integrity|slab support|loss of support|tread\/riser|railing anchorage)\b/);
  addWhen('General Contractor', /\b(barricade|temporary protection|work zone|site safety|pedestrian detour|housekeeping|construction debris|daily safety|stored material|gate latch|gate sweep|gate-control|access-control|recreation|bench|waste receptacle)\b/);

  if (!matches.size) matches.add('General Contractor');
  return DISCIPLINE_ORDER.filter((discipline) => matches.has(discipline));
}

function representativePhotos(photos: FieldPhoto[], preferred: string[] = []) {
  if (!photos.length) return [];
  const selected: FieldPhoto[] = [];
  preferred.forEach((name) => {
    const match = photos.find((photo) => photoFileLabel(photo).toLowerCase() === name.toLowerCase());
    if (match && !selected.includes(match)) selected.push(match);
  });
  [photos[0], photos[Math.floor(photos.length / 2)], photos.at(-1)].forEach((photo) => {
    if (photo && !selected.includes(photo) && selected.length < 3) selected.push(photo);
  });
  return selected.slice(0, 3);
}

function priorityFromSeverity(severity: FieldSeverity): ScopePriority {
  if (severity === 'critical') return 'Immediate field check';
  if (severity === 'high') return 'Priority repair';
  return 'Planned closeout';
}

function genericGroups(photos: FieldPhoto[], items: FieldItem[]): PhotoScopeGroup[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const grouped = new Map<string, FieldPhoto[]>();
  photos.forEach((photo) => {
    const key = photo.item_id || `category:${photoCategory(photo)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), photo]);
  });
  return [...grouped.entries()].map(([key, groupPhotos], index) => {
    const item = itemMap.get(key);
    const category = photoCategory(groupPhotos[0]);
    const distinctObservations = [...new Set(groupPhotos.map(photoObservation))].slice(0, 5);
    const distinctActions = [...new Set(groupPhotos.map(photoRecommendedAction))].slice(0, 5);
    const issueCount = Math.max(distinctObservations.length, distinctActions.length);
    const issues: GlorietaScopeIssue[] = Array.from({ length: issueCount }, (_, issueIndex) => ({
      title: item?.title || `${category.replace(/_/g, ' ')} condition ${issueIndex + 1}`,
      photoRefs: groupPhotos.filter((_, photoIndex) => photoIndex % issueCount === issueIndex).slice(0, 4).map(photoFileLabel).join(', '),
      observation: distinctObservations[issueIndex] || distinctObservations[0] || 'Visible condition requires field confirmation.',
      scope: distinctActions[issueIndex] || distinctActions[0] || 'Field-verify the condition, measure the repair limits and submit a defined repair approach.',
      ownerOutcome: 'A documented repair decision with comparable before-and-after evidence.',
    }));
    const severity = (item?.severity || photoSeverity(groupPhotos[0])) as FieldSeverity;
    return {
      key,
      sequence: index + 1,
      title: item?.title || category.replace(/_/g, ' '),
      priority: priorityFromSeverity(severity),
      photoRange: groupPhotos.map(photoFileLabel).join(', '),
      photos: groupPhotos,
      representativePhotos: representativePhotos(groupPhotos),
      ownerSummary: item?.description || `We grouped ${groupPhotos.length} photographs that appear to document related ${category.replace(/_/g, ' ')} conditions. Each condition should be confirmed and located before pricing.`,
      contractorReadout: 'Field-verify the visible conditions, separate repairs into measurable line items, protect occupied areas and provide matching-angle closeout evidence.',
      issues,
      verification: ['Field-confirm location and quantity', 'Document protection and repair method', 'Provide before, progress and after photographs'],
      confirmedCount: groupPhotos.filter((photo) => photo.review_status === 'confirmed').length,
      highPriorityCount: groupPhotos.filter((photo) => ['high', 'critical'].includes(photoSeverity(photo))).length,
    };
  });
}

export function buildPhotoScopeGroups(photos: FieldPhoto[], items: FieldItem[]): PhotoScopeGroup[] {
  const numbered = photos.filter((photo) => photoNumber(photo) !== null);
  const isGlorietaWalk = numbered.some((photo) => photoNumber(photo) === 1209)
    && numbered.some((photo) => photoNumber(photo) === 1361);
  if (!isGlorietaWalk) return genericGroups(photos, items);

  return GLORIETA_SCOPE_TEMPLATES.map((template, index) => {
    const groupPhotos = numbered
      .filter((photo) => {
        const number = photoNumber(photo);
        return number !== null && number >= template.start && number <= template.end;
      })
      .sort((a, b) => (photoNumber(a) ?? 0) - (photoNumber(b) ?? 0));
    return {
      key: template.key,
      sequence: index + 1,
      title: template.title,
      priority: template.priority,
      photoRange: `IMG_${template.start}–IMG_${template.end}`,
      photos: groupPhotos,
      representativePhotos: representativePhotos(groupPhotos, template.representativeFiles),
      ownerSummary: template.ownerSummary,
      contractorReadout: template.contractorReadout,
      issues: template.issues,
      verification: template.verification,
      confirmedCount: groupPhotos.filter((photo) => photo.review_status === 'confirmed').length,
      highPriorityCount: groupPhotos.filter((photo) => ['high', 'critical'].includes(photoSeverity(photo))).length,
    };
  }).filter((group) => group.photos.length > 0);
}

function priorityClass(priority: ScopePriority) {
  if (priority === 'Immediate field check') return 'immediate';
  if (priority === 'Priority repair') return 'priority';
  return 'planned';
}

function disciplineClass(discipline: ScopeDiscipline) {
  return discipline.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
}

function disciplineCounts(groups: PhotoScopeGroup[]) {
  const counts = new Map<ScopeDiscipline, number>();
  groups.flatMap((group) => group.issues).forEach((issue) => {
    classifyScopeIssue(issue).forEach((discipline) => counts.set(discipline, (counts.get(discipline) ?? 0) + 1));
  });
  return counts;
}

export function buildFieldPhotoScopeReport({ projectName, photos, items, imageUrls = {} }: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  imageUrls?: Record<string, string>;
}) {
  const groups = buildPhotoScopeGroups(photos, items);
  const confirmed = photos.filter((photo) => photo.review_status === 'confirmed');
  const drafts = photos.filter((photo) => photo.review_status !== 'confirmed');
  const issueCount = groups.reduce((sum, group) => sum + group.issues.length, 0);
  const immediateCount = groups.filter((group) => group.priority === 'Immediate field check').length;
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const generatedAt = new Date();
  const reportDisciplineCounts = disciplineCounts(groups);
  const deliveryPlan = HUD_READINESS_DELIVERY_PACKAGES.map((entry) => `<div class="delivery-card"><span>${escapeHtml(entry.lead)}</span><h3>${escapeHtml(entry.title)}</h3><div class="disciplines">${entry.disciplines.map((discipline) => `<i class="discipline ${disciplineClass(discipline)}">${escapeHtml(discipline)}</i>`).join('')}</div><p>${escapeHtml(entry.direction)}</p></div>`).join('');

  const groupSections = groups.map((group) => {
    const thumbnails = group.representativePhotos.map((photo) => {
      const url = imageUrls[photo.id] || imageUrls[photo.photo_id] || '';
      return `<figure>${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(photoFileLabel(photo))}">` : '<div class="photo-placeholder">Photograph</div>'}<figcaption>${escapeHtml(photoFileLabel(photo))}</figcaption></figure>`;
    }).join('');
    const groupDisciplines = [...new Set(group.issues.flatMap(classifyScopeIssue))];
    const groupTradeTags = groupDisciplines.map((discipline) => `<i class="discipline ${disciplineClass(discipline)}">${escapeHtml(discipline)}</i>`).join('');
    const scopeRows = group.issues.map((issue, issueIndex) => {
      const tradeTags = classifyScopeIssue(issue).map((discipline) => `<i class="discipline ${disciplineClass(discipline)}">${escapeHtml(discipline)}</i>`).join('');
      return `<div class="issue"><div class="issue-number">${group.sequence}.${issueIndex + 1}</div><div><h4>${escapeHtml(issue.title)}</h4><p class="refs">${escapeHtml(issue.photoRefs)}</p><div class="disciplines"><b>Trade assignment</b>${tradeTags}</div><div class="issue-grid"><p><b>Visible condition</b>${escapeHtml(issue.observation)}</p><p><b>Proposed scope</b>${escapeHtml(issue.scope)}</p><p><b>Owner result</b>${escapeHtml(issue.ownerOutcome)}</p></div></div></div>`;
    }).join('');
    return `<section class="package"><div class="package-head"><div><span class="package-number">Work package ${String(group.sequence).padStart(2, '0')}</span><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.photoRange)} · ${group.photos.length} photographs · ${group.confirmedCount} human-confirmed</p><div class="disciplines group-disciplines">${groupTradeTags}</div></div><span class="priority ${priorityClass(group.priority)}">${escapeHtml(group.priority)}</span></div><div class="photos">${thumbnails}</div><div class="readout"><div><span>Owner readout</span><p>${escapeHtml(group.ownerSummary)}</p></div><div><span>Contractor / consultant approach</span><p>${escapeHtml(group.contractorReadout)}</p></div></div><h3>Detailed scope-development register</h3>${scopeRows}<div class="verify"><b>Closeout evidence required</b>${group.verification.map((entry) => `<span>✓ ${escapeHtml(entry)}</span>`).join('')}</div></section>`;
  }).join('');

  const registerRows = photos.map((photo) => {
    const item = photo.item_id ? itemMap.get(photo.item_id) : null;
    const confirmedRow = photo.review_status === 'confirmed';
    return `<tr><td>${escapeHtml(photoFileLabel(photo))}</td><td><span class="pill ${confirmedRow ? 'confirmed' : 'draft'}">${confirmedRow ? 'Confirmed' : 'AI draft / pending review'}</span></td><td>${escapeHtml(photoCategory(photo).replace(/_/g, ' '))}<br><small>${escapeHtml(photoSeverity(photo))}</small></td><td>${escapeHtml(photo.reviewed_location || item?.location_label || 'Location to verify')}</td><td>${escapeHtml(photoObservation(photo))}</td><td>${escapeHtml(photoRecommendedAction(photo))}</td><td>${escapeHtml(item?.ball_in_court?.replace(/_/g, ' ') || 'Unassigned')}</td></tr>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(projectName)} - Owner Scope Intelligence</title><style>
    @page{size:letter;margin:.45in}*{box-sizing:border-box}body{margin:0;background:#eef2ef;color:#173a32;font:12px/1.5 Arial,sans-serif}.report{max-width:1050px;margin:0 auto;background:white}.cover{position:relative;overflow:hidden;background:linear-gradient(135deg,#061f19,#0d6b57);color:white;padding:42px}.cover:after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;right:-120px;top:-150px;background:#dfbd6725}.brand{color:#edce79;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.cover h1{font:700 38px/1.05 Georgia,serif;margin:38px 0 12px}.cover .subtitle{max-width:680px;color:#d7eae4;font-size:15px}.meta{display:flex;gap:18px;flex-wrap:wrap;margin-top:28px;color:#bcd6ce;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#d8dedb}.stat{background:#fff;padding:20px}.stat b{display:block;color:#082b23;font:700 28px Georgia,serif}.stat span{color:#6b7873;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.notice{margin:24px 30px 0;border:1px solid #e2c66e;background:#fff9e8;border-radius:14px;padding:14px;color:#5c4914}.executive{margin:26px 30px;padding:22px;border-radius:18px;background:#f0f7f4}.executive h2{margin:0 0 8px;font:700 24px Georgia,serif;color:#082b23}.executive p{margin:0;color:#4b625b}.matrix{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.matrix div{border:1px solid #d9e6e0;border-radius:12px;background:white;padding:12px}.matrix b{display:block;font-size:20px;color:#0d6b57}.hud-plan{margin:26px 30px;border:1px solid #c9ddd5;border-radius:18px;overflow:hidden}.hud-plan-head{background:#082b23;color:white;padding:20px 22px}.hud-plan-head span{color:#edce79;font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.hud-plan-head h2{margin:4px 0;font:700 24px Georgia,serif}.hud-plan-head p{margin:0;max-width:800px;color:#c5dad3}.trade-counts{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.trade-counts b{border:1px solid #ffffff30;border-radius:20px;padding:5px 8px;font-size:8px;font-weight:700}.delivery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#d7dfdb}.delivery-card{background:white;padding:16px}.delivery-card>span{color:#0d6b57;font-size:8px;font-weight:800;text-transform:uppercase}.delivery-card h3{margin:4px 0 6px;color:#082b23;font-size:13px}.delivery-card p{margin:8px 0 0;color:#53665f;font-size:9px}.disciplines{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:5px 0 8px}.disciplines>b{margin-right:2px;color:#63736d;font-size:7px;letter-spacing:.08em;text-transform:uppercase}.discipline{display:inline-block;border-radius:20px;padding:3px 6px;font-size:7px;font-style:normal;font-weight:800;text-transform:uppercase}.discipline.civil{background:#dbeafe;color:#1e40af}.discipline.electrical{background:#fef3c7;color:#854d0e}.discipline.plumbing{background:#cffafe;color:#155e75}.discipline.landscaping{background:#dcfce7;color:#166534}.discipline.stucco-envelope{background:#ffedd5;color:#9a3412}.discipline.structural-engineering{background:#ede9fe;color:#5b21b6}.discipline.general-contractor{background:#e2e8f0;color:#334155}.group-disciplines{margin-top:9px}.group-disciplines .discipline{border:1px solid #ffffff30;background:#ffffff12;color:white}.package{margin:24px 30px;border:1px solid #d7dfdb;border-radius:20px;overflow:hidden;break-before:page}.package:first-of-type{break-before:auto}.package-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:20px 22px;background:#082b23;color:white}.package-number{color:#edce79;font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.package h2{margin:4px 0;font:700 23px Georgia,serif}.package-head p{margin:0;color:#bcd6ce;font-size:10px}.priority{white-space:nowrap;border-radius:20px;padding:6px 9px;font-size:9px;font-weight:800;text-transform:uppercase}.priority.immediate{background:#fee2e2;color:#991b1b}.priority.priority{background:#fef3c7;color:#854d0e}.priority.planned{background:#dbeafe;color:#1e40af}.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#d7dfdb}.photos figure{position:relative;margin:0;background:#edf1ef}.photos img,.photo-placeholder{display:block;width:100%;height:190px;object-fit:cover}.photo-placeholder{display:grid;place-items:center;color:#94a09b}.photos figcaption{position:absolute;left:8px;bottom:8px;border-radius:12px;background:#061f19cc;color:white;padding:4px 7px;font-size:8px;font-weight:700}.readout{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 22px}.readout>div{border-left:3px solid #dfbd67;padding-left:12px}.readout span{color:#0d6b57;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.readout p{margin:5px 0 0;color:#425a53}.package>h3{margin:0;padding:8px 22px;background:#edf4f1;color:#082b23;font-size:10px;letter-spacing:.1em;text-transform:uppercase}.issue{display:grid;grid-template-columns:36px 1fr;gap:10px;border-top:1px solid #e4e8e6;padding:14px 22px;break-inside:avoid}.issue-number{display:grid;place-items:center;align-self:start;width:30px;height:30px;border-radius:10px;background:#e7f3ee;color:#0d6b57;font-size:9px;font-weight:800}.issue h4{margin:0;color:#082b23;font-size:12px}.refs{margin:1px 0 4px;color:#72817c;font-size:8px}.issue-grid{display:grid;grid-template-columns:1fr 1.35fr 1fr;gap:10px}.issue-grid p{margin:0;color:#4b5e58;font-size:9px}.issue-grid b{display:block;color:#173a32;font-size:8px;letter-spacing:.07em;text-transform:uppercase}.verify{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid #d7dfdb;background:#f8faf9;padding:12px 22px;font-size:9px}.verify b{width:100%;color:#082b23;text-transform:uppercase;letter-spacing:.08em}.verify span{border-radius:12px;background:#e7f3ee;padding:4px 7px;color:#23614e}.register{padding:28px 30px;break-before:page}.register h2{font:700 24px Georgia,serif;color:#082b23}.register table{border-collapse:collapse;width:100%;font-size:7px}.register th,.register td{border:1px solid #d7dfdb;padding:5px;vertical-align:top}.register th{background:#edf4f1;text-align:left;text-transform:uppercase;letter-spacing:.05em}.pill{display:inline-block;border-radius:20px;padding:2px 4px;font-size:6px;font-weight:bold}.confirmed{background:#dff4e8;color:#14613f}.draft{background:#fff0c8;color:#75520a}small{color:#68756f;text-transform:capitalize}.footer{padding:16px 30px 28px;color:#68756f;font-size:8px}.no-print{position:sticky;top:0;z-index:10;display:flex;justify-content:flex-end;background:#061f19;padding:8px 20px}.no-print button{border:0;border-radius:10px;background:#edce79;color:#082b23;padding:9px 14px;font-weight:800;cursor:pointer}@media print{body{background:white}.report{max-width:none}.no-print{display:none}.cover,.package-head,.hud-plan-head{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}}@media(max-width:760px){.cover{padding:28px 20px}.cover h1{font-size:31px}.stats{grid-template-columns:1fr 1fr}.matrix,.readout,.issue-grid,.delivery-grid{grid-template-columns:1fr}.package,.executive,.hud-plan{margin-left:14px;margin-right:14px}.package-head{display:block}.priority{display:inline-block;margin-top:10px}.photos img,.photo-placeholder{height:115px}.register{padding:20px 14px;overflow:auto}}
    body{font-size:14px;line-height:1.6}.brand{font-size:11px}.cover .subtitle{font-size:17px;line-height:1.55}.meta{font-size:11px}.stat span{font-size:11px}.notice,.executive p,.hud-plan-head p{font-size:13px;line-height:1.6}.executive,.matrix,.matrix div{break-inside:avoid}.hud-plan-head span,.package-number{font-size:10px}.trade-counts b{font-size:9px}.delivery-card{break-inside:avoid}.delivery-card>span{font-size:9px}.delivery-card h3{font-size:15px}.delivery-card p{font-size:12px;line-height:1.55}.disciplines>b,.discipline{font-size:9px}.package-head p{font-size:11px}.priority{font-size:10px}.photos figcaption{font-size:10px}.readout span{font-size:10px}.readout p{font-size:13px;line-height:1.55}.package>h3{font-size:11px}.issue h4{font-size:14px}.refs{font-size:10px}.issue-grid p{font-size:12px;line-height:1.5}.issue-grid b{font-size:9px}.verify{font-size:11px}.register table{font-size:9px;line-height:1.4}.register th,.register td{padding:7px}.pill{font-size:8px;padding:3px 5px}.footer{font-size:10px;line-height:1.5}@media print{.delivery-grid{display:block;background:white}.delivery-card{border-bottom:1px solid #d7dfdb}}
  </style></head><body><div class="no-print"><button onclick="window.print()">Print / Save PDF</button></div><main class="report"><header class="cover"><div class="brand">APAS Project Controls | Proj OS</div><h1>Owner Condition &amp;<br>Scope Intelligence</h1><p class="subtitle">${escapeHtml(projectName)} | A professional, evidence-linked translation of the owner walk into field checks, measurable repair packages and closeout requirements.</p><div class="meta"><span>Evidence captured August 31, 2026</span><span>Report view ${escapeHtml(generatedAt.toLocaleDateString())}</span><span>Prepared for owner review</span></div></header><section class="stats"><div class="stat"><b>${photos.length}</b><span>Photographs</span></div><div class="stat"><b>${groups.length}</b><span>Work packages</span></div><div class="stat"><b>${issueCount}</b><span>Scope line items</span></div><div class="stat"><b>${confirmed.length}</b><span>Human-confirmed</span></div></section><div class="notice"><b>How to use this report:</b> It converts visible photographic conditions into a detailed preliminary scope-development register. “Confirmed” means a person reviewed the narrative in Proj OS. All dimensions, quantities, concealed conditions, code requirements and repair methods still require appropriate field verification before contract award.</div><section class="executive"><h2>What we gathered for the owner</h2><p>The walk is best managed as ${groups.length} coordinated work packages rather than ${photos.length} disconnected photographs. The report identifies ${issueCount} granular scope-development items, prioritizes immediate field checks and states the evidence needed before the owner accepts completed work.</p><div class="matrix"><div><b>${immediateCount}</b>packages need an immediate field check</div><div><b>${drafts.length}</b>photographs remain AI-drafted or pending review</div><div><b>${groups.reduce((sum, group) => sum + group.verification.length, 0)}</b>defined closeout checks</div></div></section><section class="hud-plan"><div class="hud-plan-head"><span>Expedited owner direction | HUD inspection readiness</span><h2>One APAS-controlled program. Licensed responsibility by trade.</h2><p>APAS should consolidate the scope, pricing, schedule, decision log and closeout evidence in one place for R4. Immediate procurement should retain a general contractor, licensed plumbing/underground utility contractor, electrical contractor and structural engineer, with civil, stucco and landscape trades coordinated beneath the approved delivery plan.</p><div class="trade-counts">${[...reportDisciplineCounts.entries()].map(([discipline, count]) => `<b>${escapeHtml(discipline)} | ${count} items</b>`).join('')}</div></div><div class="delivery-grid">${deliveryPlan}</div></section>${groupSections}<section class="register"><h2>Complete photographic register</h2><table><thead><tr><th>Photo</th><th>Evidence status</th><th>Category / severity</th><th>Location</th><th>Observed condition</th><th>Recommended action</th><th>Ball in court</th></tr></thead><tbody>${registerRows}</tbody></table></section><p class="footer">Generated from current Proj OS records. Original files, EXIF metadata, uploader captions, AI drafts, annotations and review revisions remain separate in the audit record. Trade tags are preliminary routing recommendations, not license, permit, engineering or code determinations. Verify contractor licenses, permit scope, delegated design and inspection requirements before award. This report is a scope-development tool, not a permit, code determination, engineering certification or notice to proceed.</p></main></body></html>`;
}

export function buildFieldPhotoScopeEmail({ projectName, photos, items, personalMessage = '', reportUrl = '' }: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  personalMessage?: string;
  reportUrl?: string;
}) {
  const groups = buildPhotoScopeGroups(photos, items);
  const issueCount = groups.reduce((sum, group) => sum + group.issues.length, 0);
  const confirmedCount = photos.filter((photo) => photo.review_status === 'confirmed').length;
  const immediateCount = groups.filter((group) => group.priority === 'Immediate field check').length;
  const counts = disciplineCounts(groups);
  const deliveryPackages = HUD_READINESS_DELIVERY_PACKAGES.map((entry) => `<div style="border-top:1px solid #d8e2de;padding:12px 14px;background:#ffffff;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#0d6b57;font-weight:800;">Lead · ${escapeHtml(entry.lead)}</div><div style="margin:3px 0 5px;color:#082b23;font-weight:700;">${escapeHtml(entry.title)}</div><div style="font-size:11px;line-height:1.5;color:#53665f;">${escapeHtml(entry.direction)}</div></div>`).join('');
  const personal = personalMessage
    ? `<div style="margin:0 0 22px;border-left:4px solid #dfbd67;background:#fff9e8;padding:14px 16px;color:#4b452f;font-size:14px;line-height:1.6;">${escapeHtml(personalMessage).replace(/\n/g, '<br>')}</div>`
    : '';
  const liveReport = reportUrl
    ? `<div style="margin:22px 0;"><a href="${escapeHtml(reportUrl)}" style="display:inline-block;border-radius:10px;background:#082b23;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700;">Open the live owner report</a></div>`
    : '';
  const packages = groups.map((group) => {
    const trades = [...new Set(group.issues.flatMap(classifyScopeIssue))];
    const issues = group.issues.map((issue, index) => `<tr><td style="width:44px;border-top:1px solid #e2e8e5;padding:12px 8px;vertical-align:top;color:#0d6b57;font-weight:800;">${group.sequence}.${index + 1}</td><td style="border-top:1px solid #e2e8e5;padding:12px 8px;vertical-align:top;"><div style="font-weight:700;color:#082b23;">${escapeHtml(issue.title)}</div><div style="margin:3px 0 7px;color:#7a8782;font-size:10px;">${escapeHtml(issue.photoRefs)}</div><div style="margin-bottom:7px;font-size:10px;color:#0d6b57;font-weight:700;">${classifyScopeIssue(issue).map(escapeHtml).join(' · ')}</div><div style="font-size:12px;line-height:1.55;color:#485b54;"><b style="color:#173a32;">Visible:</b> ${escapeHtml(issue.observation)}<br><b style="color:#173a32;">Recommended scope:</b> ${escapeHtml(issue.scope)}<br><b style="color:#173a32;">Owner result:</b> ${escapeHtml(issue.ownerOutcome)}</div></td></tr>`).join('');
    return `<div style="margin:0 0 24px;border:1px solid #d8e2de;border-radius:14px;overflow:hidden;"><div style="background:#082b23;color:#ffffff;padding:17px 18px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#edce79;font-weight:800;">Work package ${String(group.sequence).padStart(2, '0')} · ${escapeHtml(group.priority)}</div><div style="margin-top:4px;font-family:Georgia,serif;font-size:20px;font-weight:700;">${escapeHtml(group.title)}</div><div style="margin-top:7px;color:#c6d9d3;font-size:10px;">${escapeHtml(group.photoRange)} · ${group.photos.length} photographs · ${trades.map(escapeHtml).join(' · ')}</div></div><div style="padding:15px 18px;background:#f5f9f7;font-size:12px;line-height:1.55;color:#485b54;"><b style="display:block;color:#0d6b57;text-transform:uppercase;font-size:9px;letter-spacing:1px;">Owner readout</b>${escapeHtml(group.ownerSummary)}<b style="display:block;margin-top:10px;color:#0d6b57;text-transform:uppercase;font-size:9px;letter-spacing:1px;">Contractor / consultant approach</b>${escapeHtml(group.contractorReadout)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${issues}</table><div style="padding:12px 18px;background:#eff8f3;color:#23614e;font-size:10px;"><b>Closeout evidence:</b> ${group.verification.map(escapeHtml).join(' · ')}</div></div>`;
  }).join('');

  return `<div style="margin:0;background:#edf2ef;padding:20px 8px;font-family:Arial,sans-serif;color:#173a32;"><div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;"><div style="height:6px;background:#dfbd67;"></div><div style="background:#082b23;color:#ffffff;padding:30px 28px;"><div style="color:#edce79;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">APAS Project Controls · Proj OS</div><h1 style="margin:18px 0 8px;font:700 30px/1.1 Georgia,serif;">Owner Condition &amp; Scope Intelligence</h1><div style="color:#c9ddd6;font-size:14px;">${escapeHtml(projectName)}</div></div><div style="padding:24px 28px;">${personal}<table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:0 -8px 20px;"><tr><td style="background:#f0f7f4;border-radius:10px;padding:12px;"><b style="font-size:22px;color:#082b23;">${photos.length}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Photographs</span></td><td style="background:#f0f7f4;border-radius:10px;padding:12px;"><b style="font-size:22px;color:#082b23;">${groups.length}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Work packages</span></td><td style="background:#f0f7f4;border-radius:10px;padding:12px;"><b style="font-size:22px;color:#082b23;">${issueCount}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Scope items</span></td><td style="background:#f0f7f4;border-radius:10px;padding:12px;"><b style="font-size:22px;color:#082b23;">${confirmedCount}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Confirmed</span></td></tr></table><div style="margin-bottom:22px;border-radius:14px;overflow:hidden;border:1px solid #c9ddd5;"><div style="background:#082b23;color:#ffffff;padding:18px;"><div style="color:#edce79;font-size:9px;text-transform:uppercase;letter-spacing:1.4px;font-weight:800;">Expedited owner direction · HUD inspection readiness</div><h2 style="margin:6px 0;font:700 20px Georgia,serif;">One APAS-controlled program. Licensed responsibility by trade.</h2><p style="margin:0;color:#c9ddd6;font-size:12px;line-height:1.55;">Proceed with the general contractor, licensed plumbing/underground utility contractor, electrical contractor and structural engineer while APAS consolidates scope, pricing, decisions and closeout evidence for R4.</p><div style="margin-top:10px;color:#dce9e5;font-size:10px;">${[...counts.entries()].map(([discipline, count]) => `${escapeHtml(discipline)} · ${count}`).join(' &nbsp; | &nbsp; ')}</div></div>${deliveryPackages}</div><p style="color:#485b54;font-size:13px;line-height:1.6;">This HTML edition contains every work package and recommendation. The attached PDF preserves the formatted report and representative photographic evidence.</p>${liveReport}${packages}<div style="border-top:2px solid #082b23;padding-top:12px;color:#72817c;font-size:10px;line-height:1.5;">${immediateCount} work packages require an immediate field check. Trade assignments are preliminary routing recommendations and must be verified against licensing, permitting, delegated-design and inspection requirements before award.</div></div></div></div>`;
}

export function buildFieldPhotoScopeEmailText({ projectName, photos, items, personalMessage = '', reportUrl = '' }: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  personalMessage?: string;
  reportUrl?: string;
}) {
  const groups = buildPhotoScopeGroups(photos, items);
  const lines = groups.flatMap((group) => [
    `WORK PACKAGE ${String(group.sequence).padStart(2, '0')}: ${group.title}`,
    `Owner readout: ${group.ownerSummary}`,
    `Contractor / consultant approach: ${group.contractorReadout}`,
    ...group.issues.map((issue, index) => `${group.sequence}.${index + 1} ${issue.title} [${classifyScopeIssue(issue).join(', ')}]\nRecommended scope: ${issue.scope}`),
  ]);
  return normalizeClientCopy([personalMessage, `OWNER CONDITION & SCOPE INTELLIGENCE - ${projectName}`, `${photos.length} photographs | ${groups.length} work packages | ${groups.reduce((sum, group) => sum + group.issues.length, 0)} scope items`, reportUrl ? `Live report: ${reportUrl}` : '', ...lines].filter(Boolean).join('\n\n'));
}

async function secureRepresentativeImageUrls(photos: FieldPhoto[], items: FieldItem[]) {
  const groups = buildPhotoScopeGroups(photos, items);
  const representatives = [...new Map(groups.flatMap((group) => group.representativePhotos).map((photo) => [photo.id, photo])).values()];
  const imageUrls: Record<string, string> = {};
  try {
    const { signedUrlFor } = await import('@/lib/pdf-viewer');
    const resolved = await Promise.allSettled(representatives.map(async (photo) => ({ photo, url: await signedUrlFor('project-photos', photo.photo.thumb_path || photo.photo.storage_path, 1800) })));
    resolved.forEach((result) => { if (result.status === 'fulfilled') imageUrls[result.value.photo.id] = result.value.url; });
  } catch {
    // The report remains complete if one private thumbnail cannot be signed.
  }
  return imageUrls;
}

export async function prepareFieldPhotoScopeReportDelivery(input: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  personalMessage?: string;
  reportUrl?: string;
}) {
  const imageUrls = await secureRepresentativeImageUrls(input.photos, input.items);
  const printableHtml = buildFieldPhotoScopeReport({ ...input, imageUrls });
  const { htmlReportPdfBase64 } = await import('@/lib/reports/htmlReportPdf');
  const pdf = await htmlReportPdfBase64(printableHtml);
  return {
    bodyHtml: buildFieldPhotoScopeEmail(input),
    bodyText: buildFieldPhotoScopeEmailText(input),
    pdfBase64: pdf.base64,
    pdfSize: pdf.size,
  };
}

export async function openFieldPhotoScopeReport(input: Omit<Parameters<typeof buildFieldPhotoScopeReport>[0], 'imageUrls'>) {
  const report = window.open('', '_blank');
  if (!report) throw new Error('Allow pop-ups to open the scope report.');
  report.opener = null;
  report.document.open();
  report.document.write('<!doctype html><title>Preparing owner report…</title><body style="font:16px Arial;padding:40px;color:#082b23">Preparing the APAS owner report and secure thumbnails…</body>');
  report.document.close();

  const imageUrls = await secureRepresentativeImageUrls(input.photos, input.items);
  report.document.open();
  report.document.write(buildFieldPhotoScopeReport({ ...input, imageUrls }));
  report.document.close();
}
