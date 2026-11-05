import type { PatientClinicalItem } from './clinical-history-api';

const dateFormat = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' });
export const clinicalDate = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? dateFormat.format(timestamp) : 'تاریخ ثبت نشده';
};
export const recentClinicalHistory = (items: PatientClinicalItem[]) =>
  [...items].sort((a, b) => (Date.parse(b.completedAt) || 0) - (Date.parse(a.completedAt) || 0));
