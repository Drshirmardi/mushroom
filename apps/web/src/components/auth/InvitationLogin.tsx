"use client";
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api';
import { WebSessionManager } from '@/auth/web-session';
import { LandingOtpForm } from './LandingOtpForm';
import './landing-auth.css';
const invitationSessions = new WebSessionManager(apiClient);
const copy: Record<string, string> = {
 fa: 'برای مشاهده و ادامه دعوت، با شماره دریافت‌کننده وارد شوید. اگر حساب ندارید، با تأیید همین شماره حساب شما ساخته می‌شود.',
 en: 'Sign in with the mobile number that received the invitation. Verifying your number also creates an account if needed.',
 ar: 'لمشاهدة الدعوة ومتابعتها، ادخل برقم الهاتف الذي تلقاها. سيتم إنشاء حساب عند التحقق من الرقم إذا لزم الأمر.',
 'zh-CN': '请使用收到邀请的手机号登录。若尚无账户，验证该号码后将创建账户。',
};
const titles: Record<string,string> = { fa:'ادامه دعوت', en:'Continue your invitation', ar:'متابعة الدعوة', 'zh-CN':'继续邀请' };
const loading: Record<string,string> = { fa:'در حال بررسی ورود…', en:'Checking your session…', ar:'جارٍ التحقق من الدخول…', 'zh-CN':'正在检查登录状态…' };
export function InvitationLogin({ destination }: { destination: string }) {
 const locale = useLocale();
 const [state,setState] = useState<'checking'|'anonymous'|'unavailable'>('checking');
 const complete = useCallback(() => window.location.assign(destination), [destination]);
 useEffect(() => {
   let active = true;
   void invitationSessions.bootstrap().then(session => {
     if (!active) return;
     if (session.status === 'authenticated') complete();
     else setState(session.status === 'unavailable' ? 'unavailable' : 'anonymous');
   });
   return () => { active = false; };
 }, [complete]);
 return <main className="invitation-login"><section aria-labelledby="invitation-title">
   <h1 id="invitation-title">{titles[locale] ?? titles.fa}</h1>
   <p className="invitation-login-context">{copy[locale] ?? copy.fa}</p>
   {state === 'checking' ? <p role="status">{loading[locale] ?? loading.fa}</p> : <LandingOtpForm active onAuthenticated={complete} />}
 </section></main>;
}
