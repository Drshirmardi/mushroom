import { PatientRequestError, patientErrorMessage } from './patient-request';
export function marriagePhoneError(error: unknown): string | null {
 if (!(error instanceof PatientRequestError)) return null;
 if (error.code === 'MARRIAGE_PHONE_INVALID') return 'شماره همراه معتبر وارد کنید؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.';
 if (error.code === 'MARRIAGE_SELF_INVITATION') return 'شماره همراه شخص دیگری را وارد کنید؛ دعوت به شماره خودتان ممکن نیست.';
 return null;
}
export function marriageError(error: unknown): string {
 if (error instanceof PatientRequestError) {
  if (error.code === 'MARRIAGE_PREPAYMENT_REQUIRED') return 'پیش از ساخت لینک دعوت، ابتدا هزینهٔ تست دو نفره را پرداخت کنید.';
  if (error.code === 'MARRIAGE_PREPAYMENT_ALREADY_EXISTS') return 'برای این تست یک پیش‌پرداخت فعال وجود دارد؛ صفحه را به‌روزرسانی کنید و ادامه دهید.';
  if (error.code === 'MARRIAGE_PREPAYMENT_NOT_FOUND') return 'پیش‌پرداخت قابل استردادی برای این تست یافت نشد.';
  if (error.code === 'MARRIAGE_OWN_PROFILE_INELIGIBLE') return 'مشخصات حساب شما با شرایط نقش انتخاب‌شده هم‌خوانی ندارد؛ مشخصات خود را بررسی کنید.';
  if (error.code === 'MARRIAGE_SMS_UNAVAILABLE') return 'ارسال پیامک فعلاً در دسترس نیست؛ لینک دعوت را کپی و برای همراهتان ارسال کنید.';
  if (error.code === 'MARRIAGE_SMS_RATE_LIMITED') return 'محدودیت ارسال پیامک رسیده است؛ بعداً تلاش کنید یا لینک دعوت را کپی کنید.';
  if (error.status === 404) return 'این دعوت در دسترس نیست؛ لینک را بررسی کنید یا از دعوت‌کننده لینک فعلی را بگیرید.';
  if (error.status === 401) return 'برای ادامه، دوباره وارد حساب خودتان شوید.';
 }
 return marriagePhoneError(error) ?? patientErrorMessage(error);
}
export function marriageAccountRecovery(error: unknown): boolean {
 return error instanceof PatientRequestError && (error.status === 401 || error.status === 403);
}
