export type ScopePriority = 'Immediate field check' | 'Priority repair' | 'Planned closeout';

export interface GlorietaScopeIssue {
  title: string;
  photoRefs: string;
  observation: string;
  scope: string;
  ownerOutcome: string;
}

export interface GlorietaScopeTemplate {
  key: string;
  start: number;
  end: number;
  title: string;
  priority: ScopePriority;
  representativeFiles: string[];
  ownerSummary: string;
  contractorReadout: string;
  issues: GlorietaScopeIssue[];
  verification: string[];
}

/**
 * Owner-facing scope packages derived from the complete August 31, 2026
 * Glorieta Gardens walk. These statements deliberately describe visible
 * conditions and field-verification work; they are not concealed engineering
 * conclusions or automatic authorization to proceed.
 */
export const GLORIETA_SCOPE_TEMPLATES: GlorietaScopeTemplate[] = [
  {
    key: 'entry-recreation-common-areas',
    start: 1209,
    end: 1224,
    title: 'Entry, recreation and common-area finishes',
    priority: 'Planned closeout',
    representativeFiles: ['IMG_1209.JPEG', 'IMG_1214.JPEG', 'IMG_1223.JPEG'],
    ownerSummary: 'We found several small but visible finish and maintenance conditions around the entry gate, fence planting beds, tree rings and recreation area. None should be lost as isolated housekeeping notes; together they form one clean closeout package for the property entrance and shared amenities.',
    contractorReadout: 'Carry this as an entry and common-area punch package. Field-check the gate operation first, then price the minor coating, landscape, cleaning and recreation-area restoration as separately measurable sub-items.',
    issues: [
      { title: 'Gate latch and handle operation', photoRefs: 'IMG_1209, IMG_1217', observation: 'Close views show the pedestrian-gate latch and handle assembly, including the latch-to-frame interface.', scope: 'Test opening, closing, latching and locking; adjust alignment; tighten or replace loose hardware; lubricate moving parts; touch up disturbed coating; document the completed operational test.', ownerOutcome: 'A gate that closes and secures reliably without dragging or manual manipulation.' },
      { title: 'Gate-post base coating and seal', photoRefs: 'IMG_1210', observation: 'The painted/stuccoed base at the entry post shows an irregular finish and exposed interface at the paving.', scope: 'Probe for loose material; remove unsound finish; seal the paving-to-wall transition with a compatible exterior sealant; patch texture and repaint to match.', ownerOutcome: 'A weather-tight, uniform base finish without loose coating.' },
      { title: 'Entry-door threshold and walk interface', photoRefs: 'IMG_1211, IMG_1212', observation: 'The entrance door, threshold, adjacent walk and mat transition are documented at close range.', scope: 'Confirm positive drainage, threshold seal, door sweep, mat recess/edge condition and trip-free transition; clean and repair only the deficiencies confirmed in the field.', ownerOutcome: 'A clean, dry and unobstructed entry transition.' },
      { title: 'Fence-line planting-bed restoration', photoRefs: 'IMG_1213, IMG_1214, IMG_1218', observation: 'Narrow beds along the fence contain sparse plant coverage, weeds and exposed soil.', scope: 'Define limits; remove weeds and debris; repair irrigation where required; regrade; install specified plants or sod; mulch beds; establish watering and 30-day establishment care.', ownerOutcome: 'Continuous, maintainable landscape coverage along the fence.' },
      { title: 'Tree-ring edging and turf repair', photoRefs: 'IMG_1216, IMG_1219, IMG_1220, IMG_1222', observation: 'Tree rings show inconsistent edging and bare or thin turf immediately outside the mulch limits.', scope: 'Verify root flare is not buried; reset edging to consistent circles; remove excess mulch from trunks; topdress and sod disturbed perimeter areas; water through establishment.', ownerOutcome: 'Neat tree wells with protected trunks and continuous surrounding turf.' },
      { title: 'Recreation surface, benches and walk cleaning', photoRefs: 'IMG_1221, IMG_1223, IMG_1224', observation: 'The court, benches and connecting walks show weathering, staining and localized worn ground at common-use areas.', scope: 'Clean hardscape; inspect court coating and markings; inventory damaged bench slats/fasteners; restore worn soil around benches; submit separate repair pricing for confirmed coating or furniture defects.', ownerOutcome: 'A presentable recreation area with safe, clean and serviceable amenities.' },
    ],
    verification: ['Gate operation video and closeout photograph', 'Landscape material quantities and irrigation test', 'Before/after images from matching viewpoints'],
  },
  {
    key: 'building-edges-accessible-parking',
    start: 1225,
    end: 1240,
    title: 'Building edges, accessible parking and open pavement',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1227.JPEG', 'IMG_1235.JPEG', 'IMG_1239.JPEG'],
    ownerSummary: 'This group contains the first conditions that warrant prompt field review: an exterior stucco band that appears cracked or delaminated, an open pavement repair holding water, and parking/landscape interfaces affected by disturbed soil and tree roots.',
    contractorReadout: 'Separate temporary protection from permanent repair. Secure the pavement opening first, then measure the stucco, asphalt, turf and root-zone limits so the owner receives itemized pricing rather than one broad allowance.',
    issues: [
      { title: 'Building-perimeter turf and grading', photoRefs: 'IMG_1225, IMG_1229, IMG_1231, IMG_1232, IMG_1240', observation: 'Thin turf, exposed soil and uneven restoration are visible along walls, mailboxes and walk edges.', scope: 'Measure affected square footage; verify drainage away from walls; remove construction debris; fine-grade; add clean soil where appropriate; install matching sod and establish growth.', ownerOutcome: 'Continuous turf and positive drainage along the building perimeter.' },
      { title: 'Stucco-band delamination above fenced opening', photoRefs: 'IMG_1227, IMG_1228', observation: 'A horizontal exterior finish band appears cracked, separated or patched above a fenced opening.', scope: 'Provide lift-access review; sound the finish; remove loose material; identify substrate condition; repair lath/base coat/finish coat as confirmed; seal penetrations; texture and paint to match.', ownerOutcome: 'No loose overhead finish and a sealed, visually consistent wall surface.' },
      { title: 'Fenced concrete pad finish', photoRefs: 'IMG_1230', observation: 'The enclosed concrete walking/pad area shows visible discoloration and patch-like surface variation.', scope: 'Clean a test area; identify coating, staining or surface damage; verify drainage and slip resistance; price cleaning separately from patching or coating restoration.', ownerOutcome: 'A clean, uniform and safely draining enclosed surface.' },
      { title: 'Accessible-route and parking transition', photoRefs: 'IMG_1233, IMG_1234', observation: 'The curb ramp, access aisle, striping, wheel stop and new walk connection are shown together.', scope: 'Field-measure running slope, cross slope, level landings and clear width; confirm striping/signage; check wheel-stop placement; correct only surveyed deficiencies and provide compliance closeout data.', ownerOutcome: 'A documented, unobstructed accessible route from parking to the building.' },
      { title: 'Open pavement repair with standing water', photoRefs: 'IMG_1235, IMG_1236', observation: 'A marked/open asphalt area contains water and is protected only by limited temporary devices.', scope: 'Barricade the full hazard immediately; determine depth and cause; remove unsuitable material; repair base and asphalt in compacted lifts; match drainage grades; restripe disturbed markings.', ownerOutcome: 'A protected work area followed by a flush, durable and free-draining pavement repair.' },
      { title: 'Bollard and tree-root parking edges', photoRefs: 'IMG_1237, IMG_1238, IMG_1239', observation: 'Bare soil and irregular pavement edges are visible at bollards and around a mature tree adjacent to parked vehicles.', scope: 'Review root conflicts with an arborist where cutting may be required; define pavement and landscape limits; reset/coat bollards; repair asphalt edges; restore protected root-zone surface without damaging the tree.', ownerOutcome: 'Stable parking edges, protected vehicles and preserved tree health.' },
    ],
    verification: ['Immediate temporary-protection photograph', 'Stucco sounding/field-review record', 'Accessible-route measurements', 'Asphalt repair depth and compaction record'],
  },
  {
    key: 'utility-paving-active-walks',
    start: 1241,
    end: 1256,
    title: 'Utility-cover paving and active walk restoration',
    priority: 'Priority repair',
    representativeFiles: ['IMG_1242.JPEG', 'IMG_1251.JPEG', 'IMG_1254.JPEG'],
    ownerSummary: 'The photographs show deteriorated or unfinished paving around utility covers and bollards, plus active sidewalk work whose shoulders, barricades and landscaping were not yet in final condition.',
    contractorReadout: 'Treat utility-cover interfaces, paving, accessible-route protection and landscape restoration as separate bid items. The contractor should document elevations and safe access before closing the work.',
    issues: [
      { title: 'Utility-cover asphalt interface', photoRefs: 'IMG_1241, IMG_1242, IMG_1243, IMG_1244', observation: 'Utility and sanitary covers are surrounded by patching, erosion and visibly irregular pavement.', scope: 'Identify each structure; survey rim and pavement elevations; remove failed asphalt/base to sound limits; reset cover only if authorized; place and compact repair; seal perimeter; verify drainage.', ownerOutcome: 'Flush, stable and identifiable utility structures without ponding or raveling edges.' },
      { title: 'Bollard-base soil and asphalt restoration', photoRefs: 'IMG_1243, IMG_1244, IMG_1245, IMG_1246', observation: 'Bollard bases sit within exposed soil, eroded material and irregular asphalt shoulders.', scope: 'Check bollard plumbness and embedment; remove loose material; install defined concrete or landscape collars; repair adjacent pavement; prepare and repaint damaged bollard coating.', ownerOutcome: 'Straight, visible bollards with durable, maintainable bases.' },
      { title: 'Perimeter-wall drainage strip', photoRefs: 'IMG_1247', observation: 'A narrow damp/disturbed strip is visible between parking and the perimeter wall.', scope: 'Confirm source and flow direction; check wall weeps/outlets; regrade or install a maintainable drainage strip as designed; restore adjacent pavement and landscape edges.', ownerOutcome: 'Controlled drainage without chronic wet soil at the wall.' },
      { title: 'Exterior wall-lighting check', photoRefs: 'IMG_1248, IMG_1249', observation: 'Two exterior wall fixtures and their wall penetrations are documented.', scope: 'Night-test operation and photocell control; verify fixture mounting, lens condition and sealant; replace failed lamps/fixtures only after electrical confirmation; reseal penetrations.', ownerOutcome: 'Operating, securely mounted and weather-sealed exterior lighting.' },
      { title: 'Fresh paving edge at bollard line', photoRefs: 'IMG_1250', observation: 'Newer asphalt terminates along a long bollard and landscape edge with visible loose/unfinished margins.', scope: 'Measure edge limits; compact and seal asphalt edge; remove loose aggregate; restore adjacent topsoil/sod; clean bollards and restripe where disturbed.', ownerOutcome: 'A clean pavement edge that will not unravel into the landscape.' },
      { title: 'Dumpster enclosure and service-area housekeeping', photoRefs: 'IMG_1251', observation: 'The dumpster enclosure and adjacent pavement/wall interface show residue and unfinished-looking edge conditions.', scope: 'Clean enclosure and pad; inspect drain/slope, gate and wall condition; seal confirmed gaps; repair pavement or concrete defects; add protective details if vehicle impact is recurring.', ownerOutcome: 'A clean, draining and serviceable refuse enclosure.' },
      { title: 'Active sidewalk protection and final shoulders', photoRefs: 'IMG_1253, IMG_1254, IMG_1255, IMG_1256', observation: 'New walk sections are bordered by disturbed soil, equipment and caution tape; final shoulders are incomplete.', scope: 'Maintain a continuous protected pedestrian detour; remove forms and debris; inspect joints and edges; fine-grade both shoulders; install sod; flush transitions; reopen only after safe-access review.', ownerOutcome: 'A completed walk with safe temporary routing and fully restored edges.' },
    ],
    verification: ['Utility-cover elevation log', 'Lighting nighttime test', 'Accessible detour plan', 'Walk joint/edge and sod closeout photographs'],
  },
  {
    key: 'ponding-penetrations-drainage',
    start: 1257,
    end: 1272,
    title: 'Pavement ponding, wall penetrations and drainage outlets',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1259.JPEG', 'IMG_1260.JPEG', 'IMG_1271.JPEG'],
    ownerSummary: 'This group combines repeated pavement ponding with an open wall penetration and exposed drainage/plumbing outlets. Those conditions should be verified quickly because water management and weather protection affect both asset life and resident access.',
    contractorReadout: 'Do not price this as cosmetic patching alone. Establish the source of water, pavement elevations, purpose of each wall opening and outlet termination before defining permanent repairs.',
    issues: [
      { title: 'Pavement coating loss and raveling', photoRefs: 'IMG_1257, IMG_1258', observation: 'The asphalt surface shows widespread light-colored wear, coating loss or aggregate exposure.', scope: 'Confirm whether condition is coating failure or asphalt raveling; map square footage; clean and test adhesion; crack-seal and patch substrate; apply compatible sealer only after moisture/source issues are resolved.', ownerOutcome: 'A uniform, bonded pavement finish with a defined maintenance cycle.' },
      { title: 'Water-filled pavement depressions', photoRefs: 'IMG_1259, IMG_1260', observation: 'Multiple localized depressions or openings in marked parking pavement contain standing water.', scope: 'Protect affected stalls; measure depth and drainage elevations; sawcut to stable limits; correct base failure and grade; place compacted asphalt; restore striping; water-test drainage.', ownerOutcome: 'Usable parking stalls without open depressions or persistent ponding.' },
      { title: 'Unsealed exterior-wall opening', photoRefs: 'IMG_1260', observation: 'A small uncovered opening is visible in the stucco wall above the window line.', scope: 'Determine whether the opening is active, abandoned or a missing device; inspect for moisture entry; install the correct rated component or close with compatible wall assembly; seal, texture and paint.', ownerOutcome: 'A documented, weather-tight wall penetration.' },
      { title: 'Bollard/planting strip restoration', photoRefs: 'IMG_1261', observation: 'Bare soil and thin planting coverage surround a line of bollards at the building edge.', scope: 'Verify drainage and utility conflicts; define planting limits; restore soil and sod/groundcover; reset and coat bollards as required; protect wall and roots during work.', ownerOutcome: 'A clean protective strip with stable bollards and full ground coverage.' },
      { title: 'Dumpster-side drainage and fence edge', photoRefs: 'IMG_1262', observation: 'The refuse/service area shows sparse ground cover and a low-looking edge near the fence and wall.', scope: 'Confirm positive flow to an approved inlet; clear debris; regrade and stabilize soil; repair pavement/concrete edge; verify fence and dumpster access remain unobstructed.', ownerOutcome: 'A service area that drains and can be maintained without erosion.' },
      { title: 'Parking wheel stops and tree-root zones', photoRefs: 'IMG_1263–IMG_1267', observation: 'Wheel stops, parking stripes, bare tree-root areas and pavement edges are tightly grouped in occupied stalls.', scope: 'Inventory wheel-stop alignment and anchors; obtain arborist input before root disturbance; reset stops to standard layout; repair pavement edges; use a root-compatible surface treatment.', ownerOutcome: 'Orderly stalls with secured stops and reduced tree/pavement conflict.' },
      { title: 'Accessible-stall ponding', photoRefs: 'IMG_1268', observation: 'Visible water is present within or immediately beside accessible parking and access-aisle markings.', scope: 'Survey slopes and inlet elevations; locate the drainage restriction; develop a corrective paving/grading detail; protect accessible access during work; restripe and verify slopes after repair.', ownerOutcome: 'A reliably drained and measured accessible parking area.' },
      { title: 'Drain inlet and pavement transition', photoRefs: 'IMG_1269, IMG_1270', observation: 'A drain and adjoining old/new pavement or concrete transition are shown with irregular surface texture.', scope: 'Clean and inspect inlet; CCTV or flow-test if blockage is suspected; survey surrounding grades; repair failed transition; seal joints and water-test before acceptance.', ownerOutcome: 'An operating inlet with a stable, free-draining approach.' },
      { title: 'Exposed outlet and building-base seal', photoRefs: 'IMG_1271, IMG_1272', observation: 'A short white outlet projects from the wall and the adjacent building base shows exposed soil and darkened finish.', scope: 'Identify outlet source; extend or terminate it to an approved discharge point; seal wall penetration; verify no discharge undermines the foundation; repair base coating and restore grade.', ownerOutcome: 'Controlled discharge and a sealed, clean building base.' },
    ],
    verification: ['Drainage/elevation survey', 'Wall-opening identification', 'Outlet flow test', 'Water test after pavement repairs'],
  },
  {
    key: 'civil-restoration-accessible-connections',
    start: 1273,
    end: 1288,
    title: 'Civil-work restoration and accessible connections',
    priority: 'Priority repair',
    representativeFiles: ['IMG_1276.JPEG', 'IMG_1280.JPEG', 'IMG_1286.JPEG'],
    ownerSummary: 'The walk sequence shows broad disturbed lawn and trench limits around newly installed concrete, ramps, fence lines and parking islands. The primary owner concern is complete restoration and safe access—not merely whether concrete was poured.',
    contractorReadout: 'Build this package from measured linear feet of walk edge, square feet of sod, individual ramps/islands and discrete pavement repairs. Include protection, cleanup and establishment care in every unit price.',
    issues: [
      { title: 'Traffic-island and bollard finish', photoRefs: 'IMG_1273, IMG_1274', observation: 'A landscaped traffic island, utility cover and bollard line are shown at a vehicle circulation point.', scope: 'Confirm cover elevation, curb condition, bollard alignment and island drainage; repair coating/paving/landscape defects; clean markings and verify sightlines.', ownerOutcome: 'A clearly defined, stable and maintainable circulation island.' },
      { title: 'Disturbed lawn and shallow excavation', photoRefs: 'IMG_1275, IMG_1276', observation: 'Open or recently backfilled soil crosses established lawn beside new civil work.', scope: 'Confirm utility work is complete; test/compact backfill as appropriate; remove unsuitable spoil; restore grade; add topsoil; sod; water and warrant establishment.', ownerOutcome: 'No open trench, settlement or visible restoration scar.' },
      { title: 'Curb-ramp and sidewalk shoulders', photoRefs: 'IMG_1277, IMG_1278', observation: 'Accessible curb connections and walk edges are bordered by bare, uneven soil.', scope: 'Field-measure slopes and flush transitions; stabilize shoulders; remove trip lips; restore sod clear of detectable-warning surfaces; clean concrete before opening.', ownerOutcome: 'A measured, unobstructed accessible connection with stable shoulders.' },
      { title: 'Asphalt residue and surface finish', photoRefs: 'IMG_1279', observation: 'Dark linear streaks or construction residue are visible on newly treated pavement.', scope: 'Identify whether marks are loose tracking, sealcoat damage or tire pickup; clean a test area; repair coating only where bond or finish is deficient; protect completed surface from equipment.', ownerOutcome: 'A consistent final pavement appearance without loose residue.' },
      { title: 'Temporary protection at open work area', photoRefs: 'IMG_1280', observation: 'A disturbed area beside a pedestrian route is bounded by bollards and caution tape.', scope: 'Install stable, continuous barricades; maintain an accessible detour; cover or backfill hazards daily; post responsible-party contact; inspect protection at each shift.', ownerOutcome: 'A work zone that residents cannot inadvertently enter.' },
      { title: 'New sidewalk edge restoration', photoRefs: 'IMG_1281', observation: 'A new walk has exposed shoulders, soil staining and adjacent unfinished ground.', scope: 'Remove forms/residue; inspect finish and joints; fine-grade both sides; install sod flush with slab; clean surface; confirm cross drainage does not leave standing water.', ownerOutcome: 'A finished walk with supported edges and no construction residue.' },
      { title: 'Fence-line landscape completion', photoRefs: 'IMG_1282–IMG_1284', observation: 'Long fence-line areas remain sparse, muddy or unfinished after adjacent paving work.', scope: 'Measure linear limits; remove debris; correct drainage; regrade; install specified sod/groundcover; repair irrigation; protect fence fabric and posts.', ownerOutcome: 'Continuous stabilized landscape along the construction fence line.' },
      { title: 'Parking-island and bollard turf gaps', photoRefs: 'IMG_1285–IMG_1288', observation: 'Bare or thin turf remains around bollards, ramps and parking-island edges.', scope: 'Confirm vehicle overrun and drainage causes; restore soil and sod; add approved hardscape where turf cannot survive; reset/coat bollards; protect ramp clearances.', ownerOutcome: 'Durable island edges without recurring mud or bare soil.' },
    ],
    verification: ['Linear-foot and square-foot quantity sheet', 'Accessible slope measurements', 'Backfill/restoration acceptance', 'Thirty-day sod establishment review'],
  },
  {
    key: 'penetrations-stairs-drainage-grounds',
    start: 1289,
    end: 1304,
    title: 'Building penetrations, stairs, drainage and grounds cleanup',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1293.JPEG', 'IMG_1298.JPEG', 'IMG_1300.JPEG'],
    ownerSummary: 'This group shows several ordinary landscape and hardscape closeout items, but it also includes a wall opening temporarily covered with a plastic bag and stair surfaces that need hands-on review. Those items should be separated from routine grounds work.',
    contractorReadout: 'Secure and identify the wall penetration first. Then carry drainage discharge, stair repair, walk cleaning, tree housekeeping and landscape restoration as individual line items with measured limits.',
    issues: [
      { title: 'Walk-to-turf interface', photoRefs: 'IMG_1289, IMG_1290', observation: 'The new or cleaned walk meets thin, low turf at the building and accessible-route edge.', scope: 'Check slab edge support and drainage; remove debris; add topsoil; sod flush with concrete; keep vegetation clear of signs and walls.', ownerOutcome: 'A supported walk edge with continuous turf and no trip lip.' },
      { title: 'Asphalt surface residue', photoRefs: 'IMG_1291', observation: 'A broad paved area shows light-colored tracking or residue across the surface.', scope: 'Determine whether residue is temporary construction dust, uncured sealer or coating damage; clean/test; recoat only failed areas; protect until cured.', ownerOutcome: 'A clean, uniform and fully cured parking surface.' },
      { title: 'Wheel-stop anchorage and hedge clearance', photoRefs: 'IMG_1292', observation: 'A painted wheel stop and adjacent hedge/parking edge are documented at close range.', scope: 'Check stop for cracking, movement and anchors; verify setback; trim hedge to maintain vehicle/pedestrian clearance; repaint or replace as confirmed.', ownerOutcome: 'A secure stop with clear sight and walking space.' },
      { title: 'Downspout/outlet erosion', photoRefs: 'IMG_1293, IMG_1303, IMG_1304', observation: 'Roof or wall discharge points terminate over bare soil near the building and walks.', scope: 'Identify each discharge; test flow; extend to splash block, tightline or approved drain; seal connection; regrade and stabilize receiving soil.', ownerOutcome: 'Roof water discharged without eroding soil or wetting the building edge.' },
      { title: 'Foreign material lodged in tree', photoRefs: 'IMG_1294', observation: 'A plastic or foreign object is visibly wedged within a tree crotch.', scope: 'Have landscape personnel remove the object without cutting live tissue; inspect for wounds, pests or included bark; document whether arborist follow-up is needed.', ownerOutcome: 'A clean tree with any health concern identified early.' },
      { title: 'Tree-ring and adjacent turf restoration', photoRefs: 'IMG_1295', observation: 'The mulched tree base is surrounded by thin or worn turf.', scope: 'Correct mulch depth and radius; expose root flare; topdress and sod bare perimeter; establish watering while avoiding trunk contact.', ownerOutcome: 'A maintainable tree well and healthy turf transition.' },
      { title: 'Concrete pad staining and drainage', photoRefs: 'IMG_1296, IMG_1297', observation: 'The service/landing pad has dark staining and visible surface variation near the wall.', scope: 'Identify moisture or organic source; clean and dry-test; verify slope; seal cracks/joints; patch spalls or apply coating only after the source is corrected.', ownerOutcome: 'A clean pad with controlled drainage and durable repairs.' },
      { title: 'Temporarily covered wall opening', photoRefs: 'IMG_1298, IMG_1301', observation: 'An opening beside a service door appears covered with a black plastic bag; surrounding finish is incomplete.', scope: 'Restrict access; identify the removed device or penetration; inspect wiring/piping and moisture exposure; install a listed cover/device or reconstruct wall layers; seal, texture and paint.', ownerOutcome: 'A permanent, weather-rated and documented closure—not a temporary bag.' },
      { title: 'Exterior stair and railing condition', photoRefs: 'IMG_1299, IMG_1300', observation: 'Concrete stair treads, adjacent masonry finish and metal railing are shown with worn/irregular surfaces.', scope: 'Measure tread/riser consistency; inspect nosings, landings and railing anchorage; remove loose material; patch approved limits; apply slip-resistant finish; coat corroded metal.', ownerOutcome: 'Serviceable stairs with secure rails and consistent walking surfaces.' },
      { title: 'Marked concrete walk segment', photoRefs: 'IMG_1302', observation: 'A walk segment contains visible field markings at a joint or repair limit.', scope: 'Confirm why it was marked; inspect crack/joint and differential movement; route/seal or replace only the panel limits confirmed by the consultant.', ownerOutcome: 'A documented disposition for every marked walk location.' },
    ],
    verification: ['Permanent penetration-closure detail', 'Drainage discharge test', 'Stair measurements and railing check', 'Cleaning test and before/after photographs'],
  },
  {
    key: 'active-work-accessibility-service-area',
    start: 1305,
    end: 1320,
    title: 'Active work, accessible parking and service-area closeout',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1306.JPEG', 'IMG_1314.JPEG', 'IMG_1315.JPEG'],
    ownerSummary: 'This group documents active excavation and formwork around a mature tree, accessible parking interfaces, a visibly damaged wheel stop, localized ponding and unfinished service-area grounds. The owner needs protection now and measurable closeout afterward.',
    contractorReadout: 'Price tree protection, concrete/sidewalk completion, accessible parking repairs, drainage correction and service-area cleanup separately. Keep temporary safety controls in the contractor’s general requirements, not as an owner extra.',
    issues: [
      { title: 'Excavation and formwork protection', photoRefs: 'IMG_1305–IMG_1307', observation: 'Open excavation, forms, equipment and loose material are located beside occupied pedestrian and parking areas.', scope: 'Install rigid barricades and night visibility; maintain accessible passage; remove loose debris daily; verify excavation support and utility clearance; document daily safety inspection.', ownerOutcome: 'A controlled work zone that remains separated from residents and vehicles.' },
      { title: 'Mature-tree root-zone protection', photoRefs: 'IMG_1305–IMG_1307', observation: 'Civil work and equipment are operating immediately around a mature tree trunk and root zone.', scope: 'Have an arborist define protected root area; prohibit unapproved root cutting/soil stockpiling; use hand excavation where required; install trunk/root protection; provide post-work tree-care plan.', ownerOutcome: 'Completed civil work without avoidable loss of a mature tree.' },
      { title: 'Courtyard planting pocket', photoRefs: 'IMG_1308, IMG_1309', observation: 'Bare, compacted soil remains within a courtyard bed bordered by new concrete.', scope: 'Remove debris and unsuitable material; verify irrigation; amend and fine-grade soil; install specified planting/sod/mulch; protect new concrete from staining.', ownerOutcome: 'A finished, maintainable courtyard rather than an unclosed construction pocket.' },
      { title: 'Accessible parking/walk tie-in', photoRefs: 'IMG_1310–IMG_1313', observation: 'New walk panels cross accessible stalls and access aisles near wheel stops and painted markings.', scope: 'Survey slopes and clear widths; verify panel transitions, striping and stop placement; correct trip lips/low spots; clean and restripe disturbed surfaces.', ownerOutcome: 'A documented accessible route with clear, coordinated parking geometry.' },
      { title: 'Cracked or deteriorated wheel stop', photoRefs: 'IMG_1314', observation: 'A painted wheel stop shows visible cracking/delamination and surface loss.', scope: 'Remove and replace damaged stop; install corrosion-resistant anchors; verify alignment and setback; repaint adjacent markings as required.', ownerOutcome: 'A secure, intact wheel stop with no loose concrete.' },
      { title: 'Ponding at walk/parking interface', photoRefs: 'IMG_1315', observation: 'Standing water is visible beside the sidewalk and wheel-stop line.', scope: 'Survey spot elevations; confirm drainage path; adjust asphalt, gutter or inlet approach; protect access during work; water-test and photograph after repair.', ownerOutcome: 'A dry pedestrian/parking interface after normal rainfall or washdown.' },
      { title: 'Service-door/HVAC grounds restoration', photoRefs: 'IMG_1316–IMG_1319', observation: 'Thin turf, exposed soil and worn paths surround service doors, HVAC equipment and narrow walks.', scope: 'Confirm service clearances and condensate discharge; correct grade; add equipment pads/splash blocks where required; restore turf or durable groundcover; keep access unobstructed.', ownerOutcome: 'Dry, serviceable equipment access with stabilized ground.' },
      { title: 'Unsecured panel beside walk', photoRefs: 'IMG_1320', observation: 'A long panel or construction component appears to lean beside a pedestrian path.', scope: 'Remove or secure immediately; identify ownership; inspect for related damage; relocate to approved storage or dispose; document cleared route.', ownerOutcome: 'No loose stored material encroaching on the walkway.' },
    ],
    verification: ['Daily barricade log', 'Arborist/root-zone direction', 'Accessible-route survey', 'Ponding water test', 'Wheel-stop anchorage photograph'],
  },
  {
    key: 'building-five-walks-common-assets',
    start: 1321,
    end: 1336,
    title: 'Building 5 walks, trench restoration and common-area assets',
    priority: 'Priority repair',
    representativeFiles: ['IMG_1323.JPEG', 'IMG_1326.JPEG', 'IMG_1335.JPEG'],
    ownerSummary: 'Around Building 5 and adjacent common areas, the photographs show long linear restoration scars, work around mature trees, utility/common-area assets and new walks with incomplete landscape edges.',
    contractorReadout: 'Use the Building 5 identifier and GPS/photo references to create a measured restoration schedule. Separate linear trench settlement, tree-zone work, common-area fixtures and walk-edge restoration for clean bid comparisons.',
    issues: [
      { title: 'New asphalt-to-walk transition', photoRefs: 'IMG_1321', observation: 'A new asphalt edge meets a concrete walk and building corner at a recently completed transition.', scope: 'Check elevation, compaction and seal; remove loose material; confirm drainage; restore markings and adjacent soil; photograph straightedge/level verification.', ownerOutcome: 'A flush, sealed transition without raveling or ponding.' },
      { title: 'Linear lawn restoration scars', photoRefs: 'IMG_1322–IMG_1325', observation: 'Long narrow disturbed or discolored areas cross otherwise established lawns beside new walks.', scope: 'Map linear feet and width; probe for settlement; recompact/fill low areas; topdress; install matching sod; repair irrigation; maintain through establishment.', ownerOutcome: 'Continuous lawn with no visible trench settlement.' },
      { title: 'Tree work-zone and root protection', photoRefs: 'IMG_1326, IMG_1327', observation: 'Disturbed soil, equipment/lines and new hardscape are close to mature tree roots.', scope: 'Obtain arborist review; remove abandoned materials; correct grade without burying root flare; restore root-compatible surface; monitor tree condition after work.', ownerOutcome: 'A clean closeout that preserves tree health and prevents future settlement.' },
      { title: 'Recreation edging and waste receptacle', photoRefs: 'IMG_1328, IMG_1329', observation: 'Play/recreation edging and a waste receptacle are shown within the common lawn area.', scope: 'Inspect edging for protrusions and anchorage; confirm fall/clear zones; secure and level receptacle; clean area; replace damaged components identified in the field.', ownerOutcome: 'Secure, clean common-area fixtures without exposed edges.' },
      { title: 'Utility cabinet and protective bollards', photoRefs: 'IMG_1330', observation: 'A utility cabinet sits beside a bollard line and restored ground.', scope: 'Identify owner/operator; verify cabinet closure, labeling and working clearance; check bollard spacing/condition; stabilize soil and keep drainage away from cabinet.', ownerOutcome: 'Protected, accessible and clearly identified utility equipment.' },
      { title: 'Building 5 service-side appurtenances', photoRefs: 'IMG_1331–IMG_1334', observation: 'Building identification, wall outlets, HVAC/service elements and tight parking/walk clearances are documented.', scope: 'Create an asset/location inventory; verify discharge points, service clearances and wall seals; restore damaged turf/paving; correct only confirmed clearance or weatherproofing defects.', ownerOutcome: 'A traceable Building 5 service-area punch list with no unidentified openings.' },
      { title: 'New walk shoulders and courtyard restoration', photoRefs: 'IMG_1335, IMG_1336', observation: 'New concrete walks border broad bare and muddy soil areas between occupied buildings.', scope: 'Remove forms/spoil; inspect concrete finish and joints; verify drainage; fine-grade; install sod/planting; protect until established; clean walks before handover.', ownerOutcome: 'Completed courtyard walks with fully restored, draining landscape shoulders.' },
    ],
    verification: ['Building 5 location map', 'Measured trench-restoration schedule', 'Utility asset identification', 'Sod establishment and concrete closeout photographs'],
  },
  {
    key: 'rear-yards-settlement-voids',
    start: 1337,
    end: 1352,
    title: 'Rear-yard turf failure, settlement and sidewalk-edge voids',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1343.JPEG', 'IMG_1349.JPEG', 'IMG_1350.JPEG'],
    ownerSummary: 'The rear and side yards show repeated thin turf and linear depressions, culminating in visible open voids immediately beside a concrete walk. This is the strongest earthwork/restoration concern in the photo set and should be field-checked before routine landscaping conceals it.',
    contractorReadout: 'Barricade and investigate the walk-edge voids first. Then survey the full linear settlement pattern, determine whether backfill or drainage is responsible, and price excavation/restoration by verified length, width and depth.',
    issues: [
      { title: 'Fence-line vegetation and access', photoRefs: 'IMG_1337, IMG_1339, IMG_1341, IMG_1343', observation: 'Vegetation and uneven ground run along long fence sections in narrow rear-yard access zones.', scope: 'Survey property/fence line; trim invasive growth; remove debris; preserve required screening; establish maintenance access; repair fence only where ownership and damage are confirmed.', ownerOutcome: 'A passable, maintainable perimeter with controlled vegetation.' },
      { title: 'Widespread thin turf and bare soil', photoRefs: 'IMG_1338, IMG_1340, IMG_1342, IMG_1345–IMG_1348', observation: 'Multiple building-side and courtyard areas have sparse turf, bare soil and uneven surface texture.', scope: 'Soil-test representative areas; verify sunlight, irrigation and drainage; remove debris; amend/fine-grade; choose suitable sod or shade-tolerant groundcover; include establishment maintenance.', ownerOutcome: 'A realistic, sustainable ground-cover solution rather than repeated spot sod.' },
      { title: 'Narrow-passage walking surface', photoRefs: 'IMG_1344', observation: 'A narrow concrete passage between building elements shows staining and confined clearance.', scope: 'Verify minimum clear width, drainage and slip condition; pressure-clean; seal joints; patch only confirmed defects; keep door/gate operation clear.', ownerOutcome: 'A clean, draining and unobstructed service passage.' },
      { title: 'Open void beside concrete walk', photoRefs: 'IMG_1349, IMG_1350', observation: 'An open soil cavity is visible directly beside the walk edge; photographs do not establish depth or undermining extent.', scope: 'Barricade immediately; probe and document depth; inspect slab support and utility conflicts; remove loose material; place approved compacted fill or flowable fill; restore soil/sod; monitor for recurrence.', ownerOutcome: 'A supported walk edge with the hidden void eliminated and documented.' },
      { title: 'Linear settlement/trench beside walk', photoRefs: 'IMG_1351, IMG_1352', observation: 'A long narrow depression or restoration seam parallels the concrete walkway and is marked in places.', scope: 'Survey the full run; correlate with utility/as-built records; test backfill where warranted; correct low/soft areas; restore grade and sod; set a 30/90-day settlement reinspection.', ownerOutcome: 'No recurring trench depression or unsupported walk shoulder.' },
    ],
    verification: ['Immediate void-depth record', 'Surveyed linear limits and quantities', 'Backfill material/compaction documentation', 'Thirty- and ninety-day settlement checks'],
  },
  {
    key: 'access-security-final-closeout',
    start: 1353,
    end: 1361,
    title: 'Accessible-route, perimeter-security and entry closeout',
    priority: 'Immediate field check',
    representativeFiles: ['IMG_1354.JPEG', 'IMG_1359.JPEG', 'IMG_1361.JPEG'],
    ownerSummary: 'The final sequence ties together an accessible-route landscape strip, wet work areas, active paving, a perimeter-wall defect, an uncovered gate device and the entry-door threshold. It should become a formal final-access and security closeout package.',
    contractorReadout: 'Secure the exposed gate device and work zone immediately. Then complete the landscape, wall, paving and threshold closeout with individual tests and owner-review photographs.',
    issues: [
      { title: 'Raised utility enclosure and clearance', photoRefs: 'IMG_1353', observation: 'A raised concrete/utility enclosure sits immediately beside intersecting walks.', scope: 'Identify asset; verify lid/guard condition, working clearance and trip-free route; clean pad; seal joints; repair adjacent landscape or concrete only where deficient.', ownerOutcome: 'A protected utility asset that does not obstruct the walking route.' },
      { title: 'Landscape strip within accessible approach', photoRefs: 'IMG_1354, IMG_1355', observation: 'A narrow turf strip between concrete runs is thin/bare near detectable-warning and ramp surfaces.', scope: 'Verify accessible clear width and slopes; repair irrigation/grade; install sod flush with concrete; keep soil off detectable warnings; use durable infill if turf repeatedly fails.', ownerOutcome: 'A clean, stable ramp approach without mud or edge drop-off.' },
      { title: 'Wet lawn and temporary lines/hoses', photoRefs: 'IMG_1356', observation: 'The lawn appears wet or muddy with visible hoses/lines crossing the area.', scope: 'Identify irrigation or dewatering source; remove abandoned lines; repair leaks; adjust heads/schedule; aerate/regrade and restore damaged turf; verify no walkway crossing remains.', ownerOutcome: 'Controlled irrigation with no chronic mud or loose lines.' },
      { title: 'Active paving and pedestrian protection', photoRefs: 'IMG_1357', observation: 'Paving equipment and disturbed surfaces occupy an accessible parking/walk area with temporary cones.', scope: 'Provide approved temporary accessible route and stall; expand barricades; manage equipment/traffic; clean daily; restore markings and access immediately after paving cures.', ownerOutcome: 'Safe resident access throughout work and complete accessible parking restoration.' },
      { title: 'Perimeter-wall opening or impact damage', photoRefs: 'IMG_1358', observation: 'A localized opening/damaged area is visible in the precast perimeter wall surface.', scope: 'Confirm whether opening is damage, abandoned penetration or intended feature; inspect panel integrity; install compatible structural/nonstructural repair; match coating; document ownership.', ownerOutcome: 'A secure, finished perimeter wall with the defect’s purpose resolved.' },
      { title: 'Uncovered gate-control device and exposed cabling', photoRefs: 'IMG_1359', observation: 'A gate-mounted device enclosure is open or missing its cover, with internal components/cabling visible.', scope: 'Restrict contact; have qualified access-control/electrical contractor de-energize as needed; test device; replace with listed weather-rated enclosure/cover; provide strain relief, seals and operational test.', ownerOutcome: 'A safe, weather-resistant and functioning gate-control system.' },
      { title: 'Gate sweep/ground clearance', photoRefs: 'IMG_1360', observation: 'The gate, adjacent turf and concrete/asphalt transition are shown at the swing and access path.', scope: 'Test full swing and latch; verify bottom clearance and drainage; trim/restore turf; correct dragging or pinch/obstruction conditions; document final operation.', ownerOutcome: 'Reliable gate travel over a clean, stable ground interface.' },
      { title: 'Entry-door threshold final closeout', photoRefs: 'IMG_1361', observation: 'The final photograph returns to an entry threshold, wall corner and planting edge.', scope: 'Inspect sealant, door sweep, threshold fasteners, concrete edge and adjacent irrigation; clean; seal confirmed gaps; adjust door; restore planting bed; provide final closeout image.', ownerOutcome: 'A clean, sealed and operational entrance ready for owner acceptance.' },
    ],
    verification: ['Qualified gate-control service record', 'Temporary accessible-route documentation', 'Wall repair detail', 'Final gate and door operational tests'],
  },
];
