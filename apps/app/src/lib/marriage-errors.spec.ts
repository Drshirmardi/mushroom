import {describe,it,expect} from 'vitest';
import {PatientRequestError} from './patient-request';
import {marriagePhoneError,marriageError,marriageAccountRecovery} from './marriage-errors';
describe('invitation recovery',()=>{
 it('identifies editable phone errors without exposing recipient account data',()=>{for(const code of ['MARRIAGE_PHONE_INVALID','MARRIAGE_SELF_INVITATION'])expect(marriagePhoneError(new PatientRequestError(422,code))).toBeTruthy();expect(marriagePhoneError(new PatientRequestError(0,null))).toBeNull();});
 it('only suggests account recovery for access/session failures',()=>{for(const status of [0,404,429,500])expect(marriageAccountRecovery(new PatientRequestError(status,null))).toBe(false);for(const status of [401,403])expect(marriageAccountRecovery(new PatientRequestError(status,null))).toBe(true);});
 it('keeps sharing link usable on provider failure or quota',()=>{for(const code of ['MARRIAGE_SMS_UNAVAILABLE','MARRIAGE_SMS_RATE_LIMITED'])expect(marriageError(new PatientRequestError(503,code))).toContain('لینک دعوت');});
 it('maps prepayment errors to clear Persian guidance',()=>{
  expect(marriageError(new PatientRequestError(409,'MARRIAGE_PREPAYMENT_REQUIRED'))).toContain('پرداخت');
  expect(marriageError(new PatientRequestError(409,'MARRIAGE_PREPAYMENT_ALREADY_EXISTS'))).toContain('پیش‌پرداخت فعال');
  expect(marriageError(new PatientRequestError(404,'MARRIAGE_PREPAYMENT_NOT_FOUND'))).toContain('استرداد');
 });
});
