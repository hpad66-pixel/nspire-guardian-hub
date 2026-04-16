export interface Milestone {
  id: string;
  step: number;
  name: string;
  owner: string;
  anchor: string;
  priorityLabel: string;
  priorityClass: string;
  targetDate?: string;
}

export interface Area {
  key: string;
  label: string;
  milestones: Milestone[];
}

export const DEFAULT_AREAS: Area[] = [
  {
    key: 'A',
    label: 'Area A — Pre-Construction & Design',
    milestones: [
      { id: 'A-01', step: 1, name: 'Site Survey & Geotechnical Report', owner: 'Engineer', anchor: 'survey', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'A-02', step: 2, name: 'Architectural Design Finalization', owner: 'Architect', anchor: 'design', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'A-03', step: 3, name: 'Structural Engineering Review', owner: 'Engineer', anchor: 'structural', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'A-04', step: 4, name: 'Permit Application Submission', owner: 'PM', anchor: 'permit', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'A-05', step: 5, name: 'Environmental & Utility Clearances', owner: 'PM', anchor: 'clearances', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'A-06', step: 6, name: 'Value Engineering Workshop', owner: 'PM', anchor: 'value-eng', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'A-07', step: 7, name: 'Contractor Pre-Qualification', owner: 'PM', anchor: 'preq', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'A-08', step: 8, name: 'Bid Package Preparation', owner: 'PM', anchor: 'bid', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'A-09', step: 9, name: 'Owner Approval — Final Plans', owner: 'Owner', anchor: 'owner-approval', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'A-10', step: 10, name: 'Mobilization Notice to Proceed', owner: 'PM', anchor: 'ntp', priorityLabel: 'Critical', priorityClass: 'critical' },
    ],
  },
  {
    key: 'B',
    label: 'Area B — Construction Execution',
    milestones: [
      { id: 'B-01', step: 1, name: 'Site Preparation & Demolition', owner: 'GC', anchor: 'site-prep', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'B-02', step: 2, name: 'Foundation & Underground Utilities', owner: 'GC', anchor: 'foundation', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'B-03', step: 3, name: 'Structural Framing', owner: 'GC', anchor: 'framing', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'B-04', step: 4, name: 'MEP Rough-In (Mechanical, Electrical, Plumbing)', owner: 'Sub', anchor: 'mep', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'B-05', step: 5, name: 'Roofing & Exterior Envelope', owner: 'GC', anchor: 'roofing', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'B-06', step: 6, name: 'Interior Framing & Drywall', owner: 'GC', anchor: 'drywall', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'B-07', step: 7, name: 'Finish Trades (Paint, Tile, Flooring)', owner: 'Sub', anchor: 'finishes', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'B-08', step: 8, name: 'MEP Trim-Out & Testing', owner: 'Sub', anchor: 'mep-trim', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'B-09', step: 9, name: 'Landscape & Hardscape', owner: 'Sub', anchor: 'landscape', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'B-10', step: 10, name: 'Punch List & Final Inspection', owner: 'PM', anchor: 'punchlist', priorityLabel: 'Critical', priorityClass: 'critical' },
    ],
  },
  {
    key: 'C',
    label: 'Area C — Closeout & Handover',
    milestones: [
      { id: 'C-01', step: 1, name: 'Certificate of Occupancy', owner: 'PM', anchor: 'co', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'C-02', step: 2, name: 'As-Built Documentation', owner: 'Architect', anchor: 'as-built', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'C-03', step: 3, name: 'Warranty & O&M Manuals Delivered', owner: 'GC', anchor: 'warranty', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'C-04', step: 4, name: 'Systems Training for Owner', owner: 'GC', anchor: 'training', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'C-05', step: 5, name: 'Final Payment & Lien Releases', owner: 'PM', anchor: 'final-pay', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'C-06', step: 6, name: 'Owner Walk-Through & Acceptance', owner: 'Owner', anchor: 'walkthrough', priorityLabel: 'Critical', priorityClass: 'critical' },
      { id: 'C-07', step: 7, name: 'Project Archive & Lessons Learned', owner: 'PM', anchor: 'archive', priorityLabel: 'Low', priorityClass: 'low' },
      { id: 'C-08', step: 8, name: 'Retention Release', owner: 'PM', anchor: 'retention', priorityLabel: 'High', priorityClass: 'high' },
      { id: 'C-09', step: 9, name: '11-Month Warranty Walkthrough', owner: 'PM', anchor: 'warranty-walk', priorityLabel: 'Medium', priorityClass: 'medium' },
      { id: 'C-10', step: 10, name: 'Project Complete — Celebration 🎉', owner: 'All', anchor: 'complete', priorityLabel: 'Milestone', priorityClass: 'milestone' },
    ],
  },
];
