import type { SafetyIncident } from '@/hooks/useSafety';

export interface OSHA300Row {
  caseNo: string;
  employeeName: string;
  jobTitle: string;
  dateOfInjury: string;
  whereEvent: string;
  describeInjury: string;
  death: boolean;
  daysAway: boolean;
  jobTransfer: boolean;
  otherRecordable: boolean;
  daysAwayCount: number;
  daysTransferCount: number;
  injuryType: 'injury' | 'skin_disorder' | 'respiratory' | 'poisoning' | 'hearing_loss' | 'other_illness';
}

export function incidentToOSHA300Row(incident: SafetyIncident): OSHA300Row {
  const injuryTypeMap: Record<string, OSHA300Row['injuryType']> = {
    injury: 'injury',
    skin_disorder: 'skin_disorder',
    respiratory: 'respiratory',
    poisoning: 'poisoning',
    hearing_loss: 'hearing_loss',
    other_illness: 'other_illness',
  };

  return {
    caseNo: incident.case_number ?? '',
    employeeName: incident.is_privacy_case ? 'Privacy Case' : incident.injured_employee_name,
    jobTitle: incident.is_privacy_case ? '' : (incident.injured_employee_job_title ?? ''),
    dateOfInjury: incident.incident_date,
    whereEvent: incident.location_description,
    describeInjury: incident.what_happened,
    death: incident.resulted_in_death,
    daysAway: incident.resulted_in_days_away,
    jobTransfer: incident.resulted_in_transfer,
    otherRecordable: incident.resulted_in_other_recordable,
    daysAwayCount: incident.days_away_from_work ?? 0,
    daysTransferCount: (incident.days_on_job_transfer ?? 0) + (incident.days_on_restriction ?? 0),
    injuryType: injuryTypeMap[incident.injury_type ?? 'injury'] ?? 'injury',
  };
}

export function printOSHA300() {
  window.print();
}
