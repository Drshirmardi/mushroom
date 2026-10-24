import { describe, expect, it } from 'vitest';
import { intakeBody, intakeDraft, intakeIssue } from './intake-form';

describe('health intake draft', () => {
  it('reuses entry birth date without inferring a medical sex answer from profile gender', () => {
    expect(intakeDraft(null, '1990-01-02')).toMatchObject({ birthDate: '1990-01-02', sexAtBirth: null });
  });
  it('preserves existing clinical answers and normalizes serialized dates for display', () => {
    const draft = intakeDraft({ birthDate: '1989-01-01T00:00:00Z', sexAtBirth: 'INTERSEX', heightCm: 170, allergyReport: { status: 'PRESENT', items: ['Synthetic allergy'] } } as never, '1990-01-02');
    expect(draft).toMatchObject({ birthDate: '1989-01-01', sexAtBirth: 'INTERSEX', heightCm: '170', allergyReport: { status: 'PRESENT', items: ['Synthetic allergy'] } });
  });
  it('requires honest health answers and details for yes while allowing unknown and skipping lifestyle', () => {
    const draft = intakeDraft(null, '1990-01-02');
    expect(intakeIssue(draft, true)).not.toBeNull();
    const answered = { ...draft, allergyReport: { status: 'UNKNOWN' as const, items: [] }, chronicConditionReport: { status: 'NONE' as const, items: [] }, currentMedicationReport: { status: 'PRESENT' as const, items: [''] } };
    expect(intakeIssue(answered, true)).not.toBeNull();
    answered.currentMedicationReport.items = ['Synthetic medicine', '', ' second medicine '];
    expect(intakeIssue(answered, true)).toBeNull();
    expect(intakeBody(answered, 3)).toMatchObject({ expectedRevision: 3, sexAtBirth: null, heightCm: null, currentMedicationReport: { status: 'PRESENT', items: ['Synthetic medicine', 'second medicine'] } });
  });
});
