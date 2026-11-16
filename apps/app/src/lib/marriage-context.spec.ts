import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentInvitationContext, invitationContext, invitationServiceRoute, marriageHref, rememberInvitationActor, storedInvitation } from './marriage-context';
const id='11111111-1111-4111-8111-111111111111';
afterEach(() => { rememberInvitationActor(undefined,null); vi.unstubAllGlobals(); });
describe('invitation context navigation', () => {
 it('accepts exact request locators and validated continuation queries', () => {
  expect(invitationContext('/assessment/marriage/requests/'+id,'')).toBe(id);
  expect(invitationContext('/assessment/resume','marriageRequestId='+id)).toBe(id);
  expect(invitationContext('/assessment/resume','marriageRequestId=not-a-uuid')).toBeNull();
 });
 it('keeps private continuation separate for each account and excludes unrelated routes', () => {
  const values=new Map<string,string>();
  vi.stubGlobal('sessionStorage',{setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)??null});
  const location={pathname:'/profile/wallet/payment-result',search:'?intentId=22222222-2222-4222-8222-222222222222',origin:'https://app.example'};
  vi.stubGlobal('window',{location,dispatchEvent:vi.fn()});
  rememberInvitationActor('one',id);
  expect(currentInvitationContext()).toBe(id);
  expect(marriageHref('/assessment/resume?grantId=owned')).toBe('/assessment/resume?grantId=owned&marriageRequestId='+id);
  expect(marriageHref('https://outside.example')).toBe('https://outside.example');
  rememberInvitationActor('two',null);expect(currentInvitationContext()).toBeNull();expect(storedInvitation('one')).toBe(id);
  rememberInvitationActor('one',null);location.search='?intentId=33333333-3333-4333-8333-333333333333';expect(currentInvitationContext()).toBeNull();location.pathname='/';expect(currentInvitationContext()).toBeNull();
  expect(invitationServiceRoute('/store')).toBe(false);
 });
});
