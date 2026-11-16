/** Convert database Decimal before the global ClassSerializerInterceptor traverses it. */
export function intakeSnapshot(revision: Record<string, unknown>) {
  const keys = ['birthDate', 'sexAtBirth', 'heightCm', 'weightKg', 'bloodType', 'allergyReport', 'chronicConditionReport', 'currentMedicationReport', 'sleepDurationBand', 'exerciseFrequency', 'stressLevel', 'tobaccoUse'];
  return Object.fromEntries(keys.map(key => [key, revision[key] == null ? null : key === 'weightKg' ? Number(revision[key]) : revision[key]]));
}
