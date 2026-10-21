"use client";

import type { AssessmentVersion } from '@/lib/assessment-api';
import { validateAuthoring } from './assessment-authoring';
import { validateMizajPublication } from './mizaj-authoring';

export function AssessmentPublicationReadiness({ version, dirty }: { version: AssessmentVersion | null; dirty: boolean }) {
  const issues = version && !dirty ? [...new Set([...validateAuthoring(version.structure), ...validateMizajPublication(version.structure)])] : [];
  return <section className="dashboard-card space-y-3 p-4 sm:p-5"><h3 className="text-sm font-bold">آمادگی انتشار ۱۱ + ۱</h3>
    {!version || dirty ? <p className="text-xs leading-7 text-muted-foreground">پیش‌نویس را ذخیره کنید تا سؤال‌ها و تنظیمات همین نسخه بررسی شوند.</p> : issues.length ? <ul className="list-inside list-disc space-y-2 text-xs leading-7">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p role="status" className="text-sm leading-7">بررسی اولیهٔ تنظیمات کامل است. با دکمهٔ «ذخیره و انتشار پرسشنامه» منتشر کنید؛ سرور پیش از انتشار، ساختار کامل را اعتبارسنجی می‌کند.</p>}
    <p className="text-xs leading-7 text-muted-foreground">ساخت، ویرایش، پیش‌نمایش و انتشار این آزمون توسط ادمین انجام می‌شود. نتیجه بر اساس پاسخ‌ها و متن‌هایی که برای همین نسخه تنظیم کرده‌اید نمایش داده می‌شود.</p>
  </section>;
}
