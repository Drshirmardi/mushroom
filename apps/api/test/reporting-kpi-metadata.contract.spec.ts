import { describe, expect, it } from 'vitest';
import { appointmentReportingKpiDefinitions } from '../src/modules/appointments/admin-appointments.dto';
import { assessmentReportingKpiDefinitions } from '../src/modules/assessments/admin/admin-assessment-submissions.dto';
import { treatmentActivityReportingKpiDefinitions } from '../src/modules/clinical/treatment-activity-response.dto';
import { treatmentPlanReportingKpiDefinitions } from '../src/modules/clinical/treatment-plan-response.dto';
import { commerceReportingKpiDefinitions } from '../src/modules/commerce/reporting/commerce-revenue.dto';
import { patientReportingKpiDefinitions } from '../src/modules/patients/admin/admin-patients.dto';

const definitions = [
  ...patientReportingKpiDefinitions,
  ...appointmentReportingKpiDefinitions,
  ...assessmentReportingKpiDefinitions,
  ...treatmentPlanReportingKpiDefinitions,
  ...treatmentActivityReportingKpiDefinitions,
  ...commerceReportingKpiDefinitions,
];

describe('Phase 11 KPI response metadata contract', () => {
  it('covers the frozen 21-KPI inventory with lineage, scope, calendar, and source-state rules', () => {
    expect(definitions.map(({ id }) => id)).toEqual(Array.from({ length: 21 }, (_, index) => `KPI-${String(index + 1).padStart(2, '0')}`));

    for (const definition of definitions) {
      expect(definition.formula).not.toHaveLength(0);
      expect(definition.dataOwner).not.toHaveLength(0);
      expect(definition.sourceOfTruth).toContain('PostgreSQL');
      expect(definition.scope).toBe('tenant-and-clinic');
      expect(definition.timeZone).toBe('Asia/Tehran');
      expect(definition.rounding).not.toHaveLength(0);
      expect(definition.zeroOrNotApplicableRule).not.toHaveLength(0);
      expect(definition.partialDataRule).toContain('never estimate');
      expect(definition.staleDataRule).toContain('do not claim stale');
      expect(JSON.stringify(definition).toLowerCase()).not.toContain('mock');
    }
  });

  it('retains the frozen canonical state and operational-revenue constraints', () => {
    expect(patientReportingKpiDefinitions[1]?.sourceOfTruth).toContain('PatientProfile.user → User.userProfile');
    expect(patientReportingKpiDefinitions[1]?.formula).toContain('onboardingComplete(patient) = true');
    expect(assessmentReportingKpiDefinitions[1]?.formula).toContain('state=COMPLETE');
    expect(assessmentReportingKpiDefinitions[1]?.zeroOrNotApplicableRule).toContain('INVALIDATED and IN_PROGRESS are excluded');
    expect(treatmentPlanReportingKpiDefinitions[0]?.formula).toContain('state = ACTIVE');
    expect(treatmentPlanReportingKpiDefinitions[0]?.zeroOrNotApplicableRule).toContain('DRAFT, COMPLETED, and VOIDED are excluded');
    expect(assessmentReportingKpiDefinitions[2]?.zeroOrNotApplicableRule).toContain('numerator is a subset of A');
    expect(treatmentActivityReportingKpiDefinitions[2]?.zeroOrNotApplicableRule).toContain('numerator is a subset of T');
    expect(commerceReportingKpiDefinitions[2]?.zeroOrNotApplicableRule).toContain('not Sadad settlement');
    expect(commerceReportingKpiDefinitions[4]?.formula).toContain('REQUESTED, APPROVED');
  });
});
