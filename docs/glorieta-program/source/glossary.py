# -*- coding: utf-8 -*-
"""Plain-English glossary. Every entry: what engineers call it, what it means,
and — where it matters — why it matters on this property.

Tone rule: never explain down. Assume an intelligent reader who simply has not
spent twenty years in a utility. Define the term, then say it again in the way
you would say it across a table."""

G = [
# ---------------------------------------------------------------- stormwater
dict(k="retention pond", alias=["retention area", "the pond"], term="Retention Pond",
 tech="A permitted stormwater impoundment designed to capture a defined runoff volume and release it primarily by infiltration into the ground and evaporation, rather than by discharging it downstream. Its performance is expressed as a stage-storage relationship — how many cubic feet of water it holds at each water-surface elevation — and it is regulated against a permitted storage volume and an allowable discharge rate.",
 plain="A shallow basin that holds rainwater and lets it soak into the ground instead of running off the property. Think of it as the property's bathtub: rain fills it during a storm, and it drains slowly afterwards. Its whole value is how much water it can hold. Over the years, dirt and sediment settle on the bottom and quietly steal that capacity — the pond looks the same from the bank, but it holds less than it used to.",
 why="This pond is the property's primary storage asset, and nobody currently knows how much storage is left in it. That number is the difference between a storm that drains and a storm that floods."),

dict(k="detention", alias=["detention pond"], term="Detention (vs. Retention)",
 tech="A detention facility temporarily stores runoff and releases it downstream at a controlled rate through an outfall structure. A retention facility holds the volume and disposes of it on site through infiltration. Most South Florida systems operate as a hybrid: retention up to a design volume, with controlled detention discharge above it.",
 plain="Detention slows water down and lets it out. Retention holds water and lets it soak away. One manages the rate, the other manages the volume — and a well-designed pond usually does both."),

dict(k="catch basin", alias=["catch basins", "drainage structure", "drainage structures"], term="Catch Basin",
 tech="An inlet structure — typically a concrete box with a grate or curb opening — that receives surface runoff and conveys it into the underground piped drainage network. It also acts as a sediment sump, trapping solids before they enter the pipes.",
 plain="The grate in the parking lot that water disappears into. Underneath it is a concrete box connected to a pipe. It is also the property's first line of defense against debris — which is exactly why it fills with sediment and stops working if nobody cleans it."),

dict(k="cctv inspection", alias=["cctv", "closed-circuit television inspection"], term="CCTV Inspection",
 tech="Closed-circuit television inspection: a self-propelled or winched camera is run through a pipe reach, producing continuous distance-referenced video. Output includes pipe diameter, material, joint condition, slope indication, and coded structural and operational defects.",
 plain="A camera on wheels driven through the pipe, recording the whole way. It is the only way to see the condition of a buried pipe without digging it up — and it answers questions no drawing can: is the pipe cracked, is it full of sediment, has it collapsed."),

dict(k="nassco pacp", alias=["pacp"], term="NASSCO PACP",
 tech="Pipeline Assessment Certification Program — the North American industry standard for coding pipe defects observed during CCTV inspection. It produces a consistent, numerically graded condition score for each defect and each reach.",
 plain="A standard scoring system for pipe defects, so 'bad condition' means the same thing to every engineer, contractor and regulator who reads the report. Without it, a condition assessment is one inspector's opinion."),

dict(k="invert", alias=["inverts", "rim and invert"], term="Invert & Rim",
 tech="The invert is the elevation of the inside bottom of a pipe where it enters or leaves a structure. The rim is the elevation of the structure's top at grade. The difference between inverts across a reach establishes the pipe's slope, and therefore whether it drains by gravity.",
 plain="The rim is the top of the manhole you see. The invert is the bottom of the pipe below it. The difference between the inverts at each end of a pipe tells you which way the water actually flows — and whether it flows at all."),

dict(k="exfiltration trench", alias=["exfiltration"], term="Exfiltration Trench",
 tech="A perforated pipe bedded in clean gravel and wrapped in filter fabric, installed below the water table, that distributes stormwater into the surrounding soil. In Miami-Dade it is designed under Chapter 24 criteria using the site's measured hydraulic conductivity.",
 plain="A gravel-filled trench with a slotted pipe running through it, buried underground. Water enters the pipe and seeps out sideways into the soil. It is the standard South Florida way to add drainage capacity when there is no room for another pond — but it only works if the soil actually absorbs water, which is why we test the soil first."),

dict(k="hydraulic conductivity", alias=["permeability", "permeability testing", "percolation"], term="Hydraulic Conductivity (Permeability)",
 tech="A measured soil property expressing the rate at which water moves through a saturated soil, typically reported in cubic feet per second per square foot per foot of head. It is the governing design input for exfiltration and retention sizing.",
 plain="How fast water soaks into the ground here, measured rather than assumed. It is the single number that decides how big a drainage feature has to be. Guess it high and the system floods; guess it low and you overbuild by hundreds of thousands of dollars."),

dict(k="seasonal high water table", alias=["seasonal high groundwater", "water table"], term="Seasonal High Water Table",
 tech="The highest elevation the groundwater surface is expected to reach in a normal wet season. It sets the lower design limit for infiltration systems, since storage below the water table is unavailable.",
 plain="In the wet season the groundwater rises. Anything buried below that level is already sitting in water and cannot absorb any more. It is the floor under every drainage design in South Florida."),

dict(k="stage-storage", alias=["stage-storage curve", "stage-storage relationship"], term="Stage-Storage Curve",
 tech="A curve relating water-surface elevation (stage) in a basin to the volume of water stored at that elevation. It is derived from survey and is the fundamental input to routing calculations.",
 plain="A simple chart: at each water level in the pond, how many gallons is it holding. It is how you convert 'the pond looks full' into an actual number you can design against."),

dict(k="bathymetric survey", alias=["bathymetric"], term="Bathymetric Survey",
 tech="Survey of the submerged bottom surface of a water body on a defined grid, typically by sonar or direct probing, referenced to a vertical datum. Paired with probing to distinguish the accumulated sediment surface from the original design bottom.",
 plain="Surveying the bottom of the pond, underwater. A normal survey stops at the waterline; this one keeps going. It is the only way to find out how much sediment has built up and how much storage that sediment has taken away."),

dict(k="digital terrain model", alias=["dtm"], term="Digital Terrain Model",
 tech="A three-dimensional surface model built from survey points, used to compute volumes between an existing surface and a proposed design surface.",
 plain="A 3-D computer model of the ground and the pond bottom. Its practical use here is arithmetic: subtract the design bottom from the current bottom and you get exactly how many cubic yards of muck have to come out — before anybody bids the job."),

dict(k="dredging", alias=["dredge", "dredge volume"], term="Dredging",
 tech="Mechanical or hydraulic removal of accumulated sediment from a basin to restore design storage volume, followed by dewatering, transport and disposal of the removed material.",
 plain="Digging the accumulated muck out of the bottom of the pond so it can hold water again. It is priced by the cubic yard, which is why knowing the volume before you start is worth more than it costs to find out."),

dict(k="waste profiling", alias=["waste profile", "material characterization", "characterization"], term="Waste Profiling",
 tech="Laboratory characterization of a material against the acceptance criteria of a receiving facility, establishing whether it classifies as clean fill, solid waste, or regulated waste, and determining lawful disposal pathway, manifesting and transport requirements.",
 plain="Testing the muck before you dig it up, to find out where it is legally allowed to go. This matters enormously to cost: clean fill is cheap to dispose of, contaminated material is not. It also avoids the worst outcome in this kind of work — excavating it, stockpiling it on site, and then finding out nobody will take it."),

dict(k="lift station", alias=["pump station", "stormwater lift station"], term="Lift Station (Pump Station)",
 tech="A wet well with pumps, controls and discharge piping that moves water from a lower elevation to a higher one where gravity flow is not available. Sizing is expressed as firm capacity — the flow deliverable with the largest pump out of service.",
 plain="A pit with pumps in it. Where the ground is too flat for water to drain away on its own, you pump it. A retention pond only performs if what comes in can also get out — and on a flat site, that usually means pumps."),

dict(k="hydraulic model", alias=["hydrologic and hydraulic model", "h&h model", "hydrologic & hydraulic model", "the model"], term="Hydrologic & Hydraulic Model",
 tech="A computational model that generates runoff from a design rainfall event (hydrology) and routes it through the pipe network, storage and control structures (hydraulics), producing water-surface elevations, flow rates and inundation extents over time.",
 plain="A computer simulation of what happens on this property when it rains hard. You put in the real pipes, the real ground shape and the real soil, then run a storm through it and watch where the water goes and how deep it gets. It is the difference between an opinion about flooding and an answer."),

dict(k="design storm", alias=["return period", "5-year", "25-year", "100-year"], term="Design Storm & Return Period",
 tech="A synthetic rainfall event of specified depth and duration with a stated annual exceedance probability. A 25-year storm has a 4% chance of being equalled or exceeded in any given year; a 100-year storm, 1%.",
 plain="A '100-year storm' does not mean once a century — it means a 1-in-100 chance of happening in any given year, which is roughly a 1-in-4 chance over a 30-year hold. Designing to three different storms tells you three different things: the 5-year is nuisance flooding, the 25-year is the regulatory standard, and the 100-year is whether people's homes take water."),

dict(k="finished floor elevation", alias=["finished floor", "finish floor elevation"], term="Finished Floor Elevation",
 tech="The elevation of the lowest habitable floor of a structure, referenced to a vertical datum. Flood protection criteria are expressed as required freeboard between the modeled peak water-surface elevation and this elevation.",
 plain="How high the floor of an apartment sits above the ground. It is the line that separates an inconvenient storm from an insurance claim, a displaced resident and a lawsuit. Every flood number in this program is ultimately measured against it."),

dict(k="level of service", alias=["flood protection level of service"], term="Level of Service",
 tech="The adopted performance standard a drainage system is designed to meet — typically expressed as no habitable-floor flooding in a stated design storm and passable roadways for emergency access in another.",
 plain="The standard you decide to build to, stated out loud. 'No water in the buildings in a 25-year storm, streets passable for a fire truck in a 100-year storm' is a level of service. Without one, nobody can say whether the system is good enough."),

dict(k="overland flow", alias=["overland flow path", "overland flow paths"], term="Overland Flow Path",
 tech="The surface route runoff follows when piped capacity is exceeded. Preserving intentional overland flow paths is a standard resilience measure for events beyond the piped design storm.",
 plain="Where the water goes once the pipes are full. Every site has these paths whether they were designed or not — the question is whether they run harmlessly to the pond or straight through somebody's front door."),

dict(k="control structure", alias=["outfall control structure", "weir", "orifice"], term="Control Structure (Weir & Orifice)",
 tech="The outfall structure that governs discharge from a basin. A weir is an overflow crest controlling higher stages; an orifice is a fixed opening controlling low-stage discharge. Their dimensions and elevations set the permitted discharge rate.",
 plain="The concrete box at the pond outlet with a notch and a hole in it. The hole controls the slow everyday drainage; the notch handles the overflow in a big storm. Those two dimensions are what the permit actually regulates — change them and you have changed the permit."),

dict(k="littoral zone", alias=["safety shelf"], term="Littoral Zone & Safety Shelf",
 tech="A shallow vegetated bench around the perimeter of a pond, typically required by permit. It provides water quality treatment through plant uptake and functions as a safety shelf preventing immediate drop-off at the water's edge.",
 plain="The shallow planted shelf around the edge of the pond. It cleans the water and, just as importantly, means someone who steps in at the bank does not go straight over their head."),

dict(k="turbidity", alias=[], term="Turbidity",
 tech="A measure of water clarity reduced by suspended particles, regulated during in-water construction. Exceedances above background at a compliance boundary trigger work stoppage.",
 plain="How muddy the water is. During dredging, regulators watch it closely — cloud up the water beyond the allowed limit and the job stops until it clears."),

dict(k="navd 88", alias=["navd88"], term="NAVD 88",
 tech="North American Vertical Datum of 1988 — the standard vertical reference for elevations in the United States. All flood, floor and invert elevations must share a single datum to be comparable.",
 plain="The common yardstick for elevation. If the survey, the flood maps and the building floors are measured from different starting points, none of the numbers can be compared — and in South Florida, a foot of error is the whole margin."),

dict(k="perforated pipe", alias=["perforated", "solid pipe"], term="Perforated vs. Solid Pipe",
 tech="Perforated pipe has openings along its barrel and is intended to exchange water with the surrounding soil, as in an exfiltration system. Solid pipe is watertight and intended purely for conveyance.",
 plain="Slotted pipe is meant to leak — it is drainage by design. Solid pipe is meant to carry water from A to B without losing any. Knowing which is which underground completely changes how the system behaves, and it is one of the first things the camera tells us."),

dict(k="illicit connection", alias=["illicit discharge", "cross-connection"], term="Illicit Connection",
 tech="Any connection to the storm sewer conveying a non-stormwater discharge. Detection and elimination is a mandatory minimum control measure under the NPDES MS4 program.",
 plain="Something plumbed into the storm drain that has no business being there — a sink, a wash bay, a sewer line crossed into the wrong pipe. It goes straight to the environment untreated, and finding one is a regulatory obligation, not an option."),

dict(k="regrading", alias=["recontouring", "recontour"], term="Regrading & Recontouring",
 tech="Reshaping site topography to establish positive drainage toward intended collection points, correct reverse slopes and low points, and set roadway crown and swale elevations to the adopted level of service.",
 plain="Reshaping the ground so water runs where you want it to. No pipe can fix a low spot that has nowhere to drain. This is the unglamorous work that makes everything else function — and on a flat site it is usually the biggest single item."),

dict(k="swale", alias=["swales"], term="Swale",
 tech="A shallow vegetated channel that conveys and infiltrates runoff, providing both conveyance and water quality treatment.",
 plain="A shallow grassy ditch that carries and soaks up rainwater. Cheap, low-maintenance, and effective — as long as nobody parks on it or fills it in."),

dict(k="stormwater management plan", alias=["swmp", "management plan"], term="Stormwater Management Plan",
 tech="The governing engineering document for a site's stormwater system: design basis, adopted level of service, system inventory, modeling results, drawings, calculations, permits, test data and the implementation sequence.",
 plain="The one document that explains the whole stormwater system — what it is, what it is designed to do, and what has to be built to get it there. Everything else in this bucket either feeds it or comes out of it. It is written first so that every project after it has a defined place in a plan, rather than being a standalone expense nobody can connect to anything."),

dict(k="stormwater operations plan", alias=["operations plan"], term="Stormwater Operations Plan",
 tech="The operational counterpart to the management plan: inspection and maintenance procedures by asset class, frequencies and triggers, pre-storm and post-storm protocols, the regulatory reporting calendar with assigned responsibility, and the evidence retention regime.",
 plain="The management plan describes the system. The operations plan runs it — who checks what, how often, what to do when a storm is coming, and what gets written down. It is the document that survives staff turnover."),

dict(k="ms4", alias=["npdes", "npdes ms4"], term="NPDES MS4 Permit",
 tech="Municipal Separate Storm Sewer System permit issued under the National Pollutant Discharge Elimination System of the Clean Water Act. It imposes minimum control measures including illicit discharge detection, good housekeeping, inspection and annual reporting.",
 plain="The federal permit that governs what the storm drain system is allowed to send to public waters. It comes with standing duties — inspect, document, report — and those duties do not pause because nobody is asking."),

dict(k="erp", alias=["environmental resource permit", "sfwmd erp"], term="SFWMD Environmental Resource Permit",
 tech="The South Florida Water Management District permit governing site stormwater management: permitted storage volume, allowable discharge rate, treatment volume and system configuration. Modifications to the permitted system require permit modification.",
 plain="The state water district's permit for how this property handles rain. It fixes how much water the site must hold and how fast it may release. Change the pond or the outfall and you are changing the permit, whether you filed for it or not."),

dict(k="chapter 24", alias=["miami-dade chapter 24"], term="Miami-Dade Chapter 24",
 tech="The Miami-Dade County Environmental Protection Code, administered by DERM. It governs drainage design criteria, exfiltration sizing, cross-connection control, well permitting and contamination assessment within the county.",
 plain="The county's environmental rulebook. Locally it usually bites harder than the state rules, and DERM enforces it."),

dict(k="derm", alias=[], term="DERM",
 tech="Miami-Dade County Department of Regulatory and Economic Resources, Division of Environmental Resources Management — the county environmental regulator for drainage, wells, contamination assessment and cross-connection control.",
 plain="The county environmental agency. They permit the wells, they review the drainage, and they are the ones who decide whether a contamination question is closed."),

dict(k="fdep", alias=[], term="FDEP",
 tech="Florida Department of Environmental Protection — the state environmental regulator, with jurisdiction over sewer certifications, contamination assessment and cleanup under Chapter 62-780 F.A.C., and solid waste.",
 plain="The state environmental agency. County and state both have a say here, and they do not always ask for the same thing."),

dict(k="consent order", alias=[], term="Consent Order",
 tech="A binding, negotiated enforcement instrument between a regulator and a respondent, enumerating specific corrective actions, deadlines and reporting obligations. It terminates only upon documented completion of every enumerated action and written release by the agency.",
 plain="A legal agreement with the regulator listing exactly what has to be fixed and by when. It does not expire on its own and it does not quietly go away — it closes when every item is done, documented, and released in writing. Until then it stays attached to the property."),

# ---------------------------------------------------------------- sewer
dict(k="gravity sewer", alias=[], term="Gravity Sewer",
 tech="A sanitary collection system in which flow is conveyed by gravity along a continuous downward slope, without pumping, from service laterals through mains to a receiving pump station or treatment facility.",
 plain="Sewer pipe laid on a constant downhill slope so waste flows on its own, no pumps. Simple and reliable — provided the slope is right, which is exactly what the record drawings and CCTV have to prove."),

dict(k="conveyance", alias=["convey", "conveyed"], term="Conveyance (Asset Transfer)",
 tech="The formal legal and administrative transfer of a constructed utility to the operating public utility, comprising engineering certifications, record drawings, testing evidence, warranties, title instruments, bills of sale and performance security, culminating in written acceptance.",
 plain="Handing the finished sewer over to the City so it becomes their pipe to own, operate, fix and pay for. Until that transfer is accepted in writing, it is still the owner's asset, the owner's repair bill and the owner's liability."),

dict(k="infiltration and inflow", alias=["i&i", "infiltration/inflow"], term="Infiltration & Inflow (I&I)",
 tech="Extraneous water entering a sanitary system: infiltration is groundwater entering through defects and joints; inflow is stormwater entering through direct connections and manhole covers. Both consume conveyance and treatment capacity and are billed as sewage.",
 plain="Groundwater and rainwater leaking into the sewer where they do not belong. You end up paying to move and treat clean water as if it were sewage. On a wet site, it can be a large share of the bill — and you cannot manage it until you can measure it."),

dict(k="flow meter", alias=["effluent flow meter", "metering station"], term="Effluent Flow Meter",
 tech="A permanent metering installation at a point of discharge, measuring flow continuously with time-stamped data logging and telemetry, calibrated to a certified accuracy and used for billing, capacity allocation and I&I quantification.",
 plain="A meter on the pipe leaving the property, recording continuously. It turns 'we think we discharge about this much' into a number nobody can argue with — for billing, for capacity, and for proving how much of the flow is actually rainwater."),

dict(k="diurnal flow", alias=["diurnal flow curve"], term="Diurnal Flow Curve",
 tech="The characteristic 24-hour pattern of sanitary flow, showing morning and evening peaks and a pre-dawn minimum. Elevated pre-dawn minimum flow, when occupied-building discharge should be near zero, is the classic signature of groundwater infiltration.",
 plain="Sewer flow follows daily life — it spikes when people shower and cook, and drops to almost nothing at 3 a.m. If it is not near zero at 3 a.m., that extra water is groundwater leaking in. It is one of the clearest diagnostics there is, and it needs a meter to see it."),

dict(k="retainage", alias=[], term="Retainage",
 tech="A percentage of each progress payment withheld by the owner and released on defined milestones — typically part at substantial completion and the balance after final warranty inspection — as security for completion and defect correction.",
 plain="Money held back from the contractor until the work is finished and proven. It is the last real leverage anyone has once the crews have left the site."),

dict(k="lien waiver", alias=["lien waivers"], term="Lien Waiver",
 tech="An executed instrument by which a contractor, subcontractor or supplier relinquishes lien rights against the property for work performed or materials supplied through a stated date, in exchange for payment.",
 plain="A signed document saying 'I have been paid and I will not put a lien on this property.' Without a complete set, a paid-in-full job can still surface as a claim against the title later."),

dict(k="substantial completion", alias=[], term="Substantial Completion",
 tech="The point at which work is sufficiently complete that the owner may occupy or use it for its intended purpose. It starts the warranty period and triggers partial retainage release.",
 plain="The date the system is usable, even if small items remain. It matters because it starts the warranty clock — which is why the date has to be established and documented, not assumed."),

dict(k="record drawings", alias=["as-built", "as-builts", "as-built survey", "record drawing"], term="Record Drawings (As-Builts)",
 tech="Drawings signed and sealed by the engineer or surveyor depicting the facility as actually constructed, including field changes, with horizontal locations and vertical elevations verified by survey.",
 plain="Drawings of what was actually built, not what was drawn beforehand. Those two things are never quite the same. Sealed as-builts are what the City accepts at conveyance, and what anyone digging here in ten years will rely on."),

dict(k="engineer of record", alias=["eor"], term="Engineer of Record",
 tech="The licensed professional engineer who takes professional responsibility for the design and issues the sealed certifications a permitting authority requires for acceptance.",
 plain="The licensed engineer whose seal and license stand behind the design. Certain documents cannot be issued by anyone else, which makes their availability a real scheduling dependency."),

dict(k="professional surveyor", alias=["psm", "professional surveyor & mapper", "professional surveyor and mapper"], term="Professional Surveyor & Mapper",
 tech="A Florida-licensed PSM authorized to sign and seal boundary, topographic and as-built surveys. Sealed surveys are required for permitting and utility conveyance.",
 plain="The licensed surveyor whose seal makes a survey official. An unsealed sketch is useful internally; only a sealed survey is accepted by a permitting agency."),

dict(k="utilities performance security", alias=["performance security"], term="Utilities Performance Security",
 tech="Financial security posted to the receiving utility at conveyance — commonly a percentage of total construction cost plus a fixed final-obligations cash bond — guaranteeing correction of defects during the acceptance and warranty period.",
 plain="A bond or deposit the City holds after taking over the system, in case something fails soon after handover. It is a real cash requirement at conveyance and is handled by the owner and counsel, not by APAS."),

# ---------------------------------------------------------------- water
dict(k="backflow preventer", alias=["backflow prevention", "backflow", "rpz", "dcva"], term="Backflow Preventer",
 tech="A mechanical assembly preventing reverse flow from a customer's system into the public potable distribution main. Device class — reduced pressure zone (RPZ) or double check valve assembly (DCVA) — is selected by hazard classification, and certified annual testing is mandatory.",
 plain="A one-way valve on the water service that stops water from flowing backwards into the public drinking water main if pressure drops. The installation is straightforward. The part people miss is that every device must be tested and certified by a licensed tester every single year, forever — and a missed test is a violation even if the device is perfect."),

dict(k="potable water", alias=["potable"], term="Potable Water",
 tech="Water treated to drinking water standards and delivered through the public distribution system, subject to Safe Drinking Water Act and F.A.C. 62-555 requirements.",
 plain="Treated drinking water. It is the most expensive water on the property, which is why using it to irrigate grass is worth reconsidering."),

dict(k="meter box", alias=["meter boxes"], term="Meter Box",
 tech="The below-grade enclosure and service setting that houses a water meter, constructed to utility standard with the service piping and appurtenances required for the utility to install and read its meter.",
 plain="The concrete or plastic box in the ground that a water meter sits in. We build the box and the setting to the City's standard; the City brings and installs the meter itself. Sequencing that handover is most of the work — a box that is not ready on the day the City arrives costs weeks."),

dict(k="subsurface utility", alias=["utility locating", "pipe locating", "electromagnetic pipe locating", "ground-penetrating radar", "gpr"], term="Subsurface Utility Locating",
 tech="Non-destructive designation of buried utilities using electromagnetic induction and ground-penetrating radar, followed where required by vacuum excavation (potholing) to physically verify horizontal position, depth, diameter and material.",
 plain="Finding buried pipes without digging up the whole site — first with instruments from the surface, then by carefully exposing a few specific spots to confirm what is actually there. It costs a fraction of what hitting a live main costs."),

dict(k="potholing", alias=["pothole", "vacuum excavation"], term="Potholing",
 tech="Small-diameter test excavation, typically by vacuum, exposing a buried utility to directly measure depth, diameter, material and condition without damaging it.",
 plain="Digging one small careful hole to physically see the pipe and confirm what the instruments said. A handful of these turns a probable location into a known one."),

dict(k="irrigation well", alias=[], term="Irrigation Well",
 tech="A permitted non-potable supply well drawing from the surficial aquifer for landscape irrigation, requiring DERM well construction permitting and SFWMD water use authorization, and physically separated from the potable system with backflow protection.",
 plain="A well that pumps groundwater for watering the grounds, instead of paying for treated drinking water to do it. It lowers the water bill, takes irrigation volume off the meters, and keeps a non-drinking use physically separate from the drinking water system."),

dict(k="aquifer", alias=["surficial aquifer"], term="Surficial Aquifer",
 tech="The shallow unconfined water-bearing formation beneath the site — in this area the Biscayne Aquifer — from which non-potable supply is typically drawn and within which contaminant migration occurs.",
 plain="The shallow groundwater under the property. It is where an irrigation well draws from — and it is also the path any contamination from a neighbouring property would travel along."),

dict(k="sunshine 811", alias=["811"], term="Sunshine 811",
 tech="Florida's statutory one-call underground utility notification system. Excavators must notify before digging so member utilities can mark their facilities. Notification does not locate private on-site utilities.",
 plain="The call-before-you-dig service. Worth knowing: it marks the utilities owned by the public utilities, not the private pipes inside a property like this one. Those are ours to find — which is exactly why the as-built work matters."),

# ---------------------------------------------------------------- environmental
dict(k="plume", alias=["plume behavior", "plume vector", "plume analysis"], term="Contaminant Plume",
 tech="A defined body of contaminated groundwater migrating from a source in the direction of the hydraulic gradient. It is characterised by its constituents, concentration distribution, extent and rate and direction of movement.",
 plain="A slow-moving underground stain in the groundwater, spreading outward from wherever it leaked. It travels with the groundwater, so it moves in one predictable direction — which means you can work out in advance which side of a property it would arrive on, and put your wells there."),

dict(k="groundwater gradient", alias=["hydraulic gradient", "groundwater flow direction", "gradient"], term="Groundwater Gradient",
 tech="The slope of the groundwater surface, determining direction and rate of flow. Established by synoptic water-level measurements across three or more wells referenced to a common datum.",
 plain="Groundwater flows downhill too — just very slowly, and the hill is invisible. Measuring the water level in several wells on the same day tells you which way it is heading, and therefore where anything dissolved in it is heading."),

dict(k="monitoring well", alias=["monitoring wells", "well network"], term="Monitoring Well",
 tech="A small-diameter cased and screened well installed to permit measurement of groundwater elevation and collection of representative groundwater samples at a defined depth interval.",
 plain="A narrow permanent pipe into the groundwater that lets you measure the water level and take samples from the same spot, year after year. One sample is a data point; the same well sampled repeatedly is a trend — and the trend is what actually answers the question."),

dict(k="upgradient", alias=["downgradient"], term="Upgradient & Downgradient",
 tech="Upgradient wells lie hydraulically above the area of interest and establish background quality. Downgradient wells lie below it and detect contaminants migrating from an upgradient source.",
 plain="Upstream and downstream, in groundwater terms. You need both: the upstream well tells you what the water looks like before it reaches the property, and the downstream well tells you what changed. Without the first, you cannot prove the second came from somewhere else."),

dict(k="contaminants of concern", alias=["coc"], term="Contaminants of Concern",
 tech="The specific analytes selected for laboratory analysis based on documented historical use and known releases at identified source properties, rather than a generic panel.",
 plain="The specific substances worth testing for, chosen from what the neighbouring properties actually did and actually spilled. Testing for the right short list beats testing for everything — it is cheaper and the results mean more."),

dict(k="cleanup target levels", alias=["gctl", "groundwater cleanup target levels"], term="Groundwater Cleanup Target Levels",
 tech="Numerical concentration standards established under Chapter 62-780 F.A.C. against which detected groundwater concentrations are compared to determine whether further assessment or remediation is required.",
 plain="The state's published thresholds. Below them, a detection is generally a non-issue; above them, obligations start. It is the line that turns a lab number into a decision."),

dict(k="chain of custody", alias=[], term="Chain of Custody",
 tech="The documented, unbroken record of sample possession and transfer from collection through laboratory analysis, required for analytical results to be defensible.",
 plain="The paper trail proving a sample went straight from the well to the lab without being tampered with. Without it, a result that favours you is not usable when it counts."),

dict(k="sanborn", alias=["sanborn map", "sanborn maps", "historical aerials"], term="Sanborn Maps & Historical Aerials",
 tech="Historical fire insurance maps and sequential aerial photography used to reconstruct prior land use, identify former structures, tanks and operations, and establish the temporal history of potential contamination sources.",
 plain="Old insurance maps and aerial photographs going back decades. They show what used to be on the neighbouring land — the tanks, the workshops, the wrecking yards — long before anyone was required to report a spill."),

dict(k="chapter 62-780", alias=["62-780"], term="Chapter 62-780 F.A.C.",
 tech="The Florida Administrative Code rule governing contaminated site cleanup criteria — assessment, risk evaluation, cleanup target levels and closure pathways including No Further Action.",
 plain="The state rulebook for contaminated sites: how you investigate, what counts as clean, and how a site formally gets closed out."),

# ------------------------------------------------------- non-revenue water
dict(k="non-revenue water", alias=["nrw"], term="Non-Revenue Water",
 tech="The difference between system input volume and billed authorized consumption, expressed as a volume and as a percentage of input. It comprises unbilled authorized consumption, apparent losses — metering inaccuracy, data-handling error and unauthorized consumption — and real losses from mains, service connections and storage.",
 plain="Water you paid for that nobody paid you for. It arrives at the property, and then some of it never shows up on a bill — because it leaked out of a pipe, because a meter is reading low, or because it was used somewhere nobody is accounting for. On a property this size, the gap between what comes in and what gets billed is usually wider than anyone expects.",
 why="Glorieta buys water from the City and is about to install a full set of meters. That combination is exactly when a water balance is worth doing — it is the only way to find out whether the property is paying every month for water that is running into the ground."),

dict(k="water balance", alias=["water audit", "awwa m36", "m36"], term="Water Balance (AWWA M36 Audit)",
 tech="The standard AWWA M36 accounting framework reconciling system input volume against authorized consumption and losses, disaggregating apparent from real losses and producing validated performance indicators including the Infrastructure Leakage Index.",
 plain="A structured ledger for water: everything that came in on one side, everything that can be accounted for on the other, and a disciplined method for explaining the difference. It being the industry-standard method matters — the result is comparable, defensible and recognised by anyone who later reviews it."),

dict(k="apparent losses", alias=["apparent loss"], term="Apparent Losses",
 tech="Non-physical losses: customer meter under-registration, systematic data transfer and billing errors, and unauthorized consumption. The water is delivered and used, but not correctly measured or billed.",
 plain="Water that did get used, but never got counted properly — an old meter reading low, a billing record nobody entered, a connection nobody knows about. These are usually the cheapest losses to fix, because the fix is a meter or a spreadsheet rather than a trench."),

dict(k="real losses", alias=["real loss", "physical losses", "leakage"], term="Real Losses",
 tech="Physical losses from the pressurised system: background leakage, reported and unreported bursts on mains and service connections, and storage overflow. Quantified against the theoretical minimum for a system of the same length, connection count and pressure.",
 plain="Water genuinely leaking out of the pipes into the ground. Most of it never surfaces — it seeps away quietly, day and night, for years. You pay for every gallon of it."),

dict(k="infrastructure leakage index", alias=["ili"], term="Infrastructure Leakage Index",
 tech="The ratio of current annual real losses to unavoidable annual real losses. An ILI of 1.0 represents the technical minimum achievable for that system's length, connections and operating pressure; higher values indicate recoverable leakage.",
 plain="A single score for how leaky this system is compared with how leaky it would be in perfect condition. A score near 1 means there is nothing worth chasing. A high score means there is real money running into the ground — and it tells you that before you spend anything digging."),

dict(k="minimum night flow", alias=["night flow"], term="Minimum Night Flow",
 tech="The lowest continuous flow rate recorded across a 24-hour cycle, typically between 2 and 4 a.m. when legitimate consumption is at its minimum. Residual flow above estimated night-time use is a direct indicator of leakage.",
 plain="At three in the morning almost nobody is using water. Whatever is still flowing at that hour is mostly leaking. It is one of the simplest and most powerful leak indicators there is, and it needs nothing more than a meter that logs continuously."),

dict(k="district metered area", alias=["dma"], term="District Metered Area",
 tech="A hydraulically discrete zone of a distribution system with metered inflow, allowing losses to be quantified and localised within that zone rather than only across the system as a whole.",
 plain="Splitting the property into metered zones, so that when the numbers say water is going missing you know which part of the site it is going missing from. It turns 'we have a leak somewhere' into 'we have a leak in this block'."),

dict(k="meter under-registration", alias=["meter accuracy", "meter accuracy testing"], term="Meter Under-Registration",
 tech="Progressive loss of accuracy in a mechanical water meter with age and cumulative throughput, characteristically most severe at low flow rates. Verified by bench or in-situ accuracy testing against a calibrated standard.",
 plain="Water meters slow down as they age, and they always err in the same direction — reading less than actually passed through. An old meter quietly tells you that you used less water than you did. That sounds like good news until you remember the City's master meter has no such problem."),

dict(k="system input volume", alias=["input volume"], term="System Input Volume",
 tech="The total volume of water entering the system over the audit period, measured at the point of supply and corrected for master meter accuracy. It is the top line of the water balance; every other figure reconciles against it.",
 plain="Everything that came onto the property through the pipe, measured at the front door. The whole audit hangs off this number, which is why the accuracy of the meter producing it has to be verified first."),

dict(k="authorized consumption", alias=["billed authorized consumption", "unbilled authorized consumption"], term="Authorized Consumption",
 tech="Water taken by registered customers and for operational purposes, whether billed or unbilled. Unbilled authorized consumption covers uses such as irrigation, line flushing and fire-fighting where these are not metered or charged.",
 plain="Water that was legitimately used — including the uses nobody sends a bill for, like irrigation, flushing lines and hydrant testing. It is not a loss, but it has to be measured or honestly estimated, otherwise it hides inside the loss figure and makes leakage look worse than it is."),
]

BYKEY = {g["k"]: g for g in G}
