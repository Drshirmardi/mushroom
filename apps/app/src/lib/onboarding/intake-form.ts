import type { MedicalIntake, SaveIntakeDraft } from './patient-onboarding';
import type { MedicalDeclaration } from '@/components/onboarding/medical-declaration-field';

type OptionalKey = 'bloodType' | 'sleepDurationBand' | 'exerciseFrequency' | 'stressLevel' | 'tobaccoUse';
type Selection<K extends OptionalKey> = Exclude<SaveIntakeDraft[K], null | undefined> | '';
export type IntakeDraft = { birthDate: string; sexAtBirth: SaveIntakeDraft['sexAtBirth']; heightCm: string; weightKg: string; allergyReport: MedicalDeclaration; chronicConditionReport: MedicalDeclaration; currentMedicationReport: MedicalDeclaration } & { [K in OptionalKey]: Selection<K> };
export const optionalFields = [
  { key: 'sleepDurationBand', label: 'معمولاً شب‌ها چقدر می‌خوابید؟', options: [['', 'انتخاب نکرده‌ام'], ['LESS_THAN_5_HOURS', 'کمتر از ۵ ساعت'], ['FROM_5_TO_LESS_THAN_7_HOURS', '۵ تا کمتر از ۷ ساعت'], ['FROM_7_TO_9_HOURS', '۷ تا ۹ ساعت'], ['MORE_THAN_9_HOURS', 'بیشتر از ۹ ساعت'], ['UNKNOWN', 'نمی‌دانم']] },
  { key: 'exerciseFrequency', label: 'چند بار در هفته ورزش می‌کنید؟', options: [['', 'انتخاب نکرده‌ام'], ['NONE', 'ورزش نمی‌کنم'], ['ONCE_OR_TWICE_WEEKLY', '۱ یا ۲ بار'], ['THREE_OR_FOUR_TIMES_WEEKLY', '۳ یا ۴ بار'], ['DAILY', 'هر روز'], ['UNKNOWN', 'نمی‌دانم']] },
  { key: 'stressLevel', label: 'این روزها چقدر استرس دارید؟', options: [['', 'انتخاب نکرده‌ام'], ['LOW', 'کم'], ['MODERATE', 'متوسط'], ['HIGH', 'زیاد'], ['VERY_HIGH', 'خیلی زیاد'], ['UNKNOWN', 'نمی‌دانم']] },
  { key: 'tobaccoUse', label: 'دخانیات مصرف می‌کنید؟', options: [['', 'انتخاب نکرده‌ام'], ['NEVER', 'خیر، هرگز مصرف نکرده‌ام'], ['FORMER', 'قبلاً مصرف می‌کردم'], ['CURRENT', 'بله، در حال حاضر'], ['UNKNOWN', 'نمی‌دانم']] },
  { key: 'bloodType', label: 'گروه خونی شما چیست؟', options: [['', 'انتخاب نکرده‌ام'], ['UNKNOWN', 'نمی‌دانم'], ['A_POSITIVE', 'A+'], ['A_NEGATIVE', 'A−'], ['B_POSITIVE', 'B+'], ['B_NEGATIVE', 'B−'], ['AB_POSITIVE', 'AB+'], ['AB_NEGATIVE', 'AB−'], ['O_POSITIVE', 'O+'], ['O_NEGATIVE', 'O−']] },
] as const;

function declaration(value: unknown): MedicalDeclaration {
  const data = value as { status?: unknown; items?: unknown } | null;
  return { status: data?.status === 'NONE' || data?.status === 'UNKNOWN' || data?.status === 'PRESENT' ? data.status : undefined, items: Array.isArray(data?.items) ? data.items.filter((item): item is string => typeof item === 'string') : [] };
}
export function intakeDraft(snapshot: MedicalIntake['snapshot'], birthDate: string | null): IntakeDraft {
  return { birthDate: (snapshot?.birthDate ?? birthDate ?? '').slice(0, 10), sexAtBirth: snapshot?.sexAtBirth ?? null, heightCm: snapshot?.heightCm == null ? '' : String(snapshot.heightCm), weightKg: snapshot?.weightKg == null ? '' : String(snapshot.weightKg), bloodType: snapshot?.bloodType ?? '', sleepDurationBand: snapshot?.sleepDurationBand ?? '', exerciseFrequency: snapshot?.exerciseFrequency ?? '', stressLevel: snapshot?.stressLevel ?? '', tobaccoUse: snapshot?.tobaccoUse ?? '', allergyReport: declaration(snapshot?.allergyReport), chronicConditionReport: declaration(snapshot?.chronicConditionReport), currentMedicationReport: declaration(snapshot?.currentMedicationReport) };
}
export function intakeIssue(draft: IntakeDraft, complete: boolean, scope: 'all' | 'health' = 'all'): string | null {
  const reports = [draft.allergyReport, draft.chronicConditionReport, draft.currentMedicationReport];
  if (complete && !draft.birthDate) return 'تاریخ تولد در مشخصات ثبت‌نام موجود نیست؛ ابتدا مشخصات خود را تکمیل کنید.';
  if (complete && reports.some(item => !item.status)) return 'لطفاً به هر سه سؤال سلامت پاسخ دهید؛ «نمی‌دانم» هم یک پاسخ معتبر است.';
  if (reports.some(item => item.status === 'PRESENT' && !item.items.some(value => value.trim()))) return 'برای مواردی که «بله» انتخاب کرده‌اید، نام دارو، بیماری یا حساسیت را بنویسید.';
  if (reports.some(item => item.items.filter(value => value.trim()).length > 50 || item.items.some(value => value.trim().length > 200))) return 'هر مورد حداکثر ۲۰۰ نویسه و هر پاسخ حداکثر ۵۰ مورد می‌تواند داشته باشد.';
  if (scope === 'health') return null;
  if (draft.heightCm && (!Number.isInteger(Number(draft.heightCm)) || Number(draft.heightCm) < 30 || Number(draft.heightCm) > 300)) return 'قد را بین ۳۰ تا ۳۰۰ سانتی‌متر، بدون اعشار وارد کنید.';
  if (draft.weightKg && (!Number.isFinite(Number(draft.weightKg)) || Number(draft.weightKg) < 2 || Number(draft.weightKg) > 500)) return 'وزن را بین ۲ تا ۵۰۰ کیلوگرم وارد کنید.';
  return null;
}
export function intakeBody(draft: IntakeDraft, expectedRevision: number): SaveIntakeDraft {
  const report = (value: MedicalDeclaration) => value.status ? { status: value.status, items: value.status === 'PRESENT' ? value.items.map(item => item.trim()).filter(Boolean) : [] } : null;
  return { expectedRevision, birthDate: draft.birthDate || null, sexAtBirth: draft.sexAtBirth, heightCm: draft.heightCm ? Number(draft.heightCm) : null, weightKg: draft.weightKg ? Number(draft.weightKg) : null, bloodType: draft.bloodType || null, sleepDurationBand: draft.sleepDurationBand || null, exerciseFrequency: draft.exerciseFrequency || null, stressLevel: draft.stressLevel || null, tobaccoUse: draft.tobaccoUse || null, allergyReport: report(draft.allergyReport), chronicConditionReport: report(draft.chronicConditionReport), currentMedicationReport: report(draft.currentMedicationReport) };
}
