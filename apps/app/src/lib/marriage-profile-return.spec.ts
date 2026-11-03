import { describe, expect, it } from 'vitest';
import { marriageProfileReturn } from './marriage-profile-return';
const id='11111111-1111-4111-8111-111111111111';
describe('service profile return', () => {
 it('retains exact creation, replacement and historical request destinations', () => {
  for (const path of ['/assessment/marriage/new/'+id, '/assessment/marriage/new/'+id+'?replaceRequestId='+id, '/assessment/marriage/requests/'+id]) expect(marriageProfileReturn(path)).toBe(path);
 });
 it('rejects external, malformed and unrelated destinations', () => {
  for (const path of [null,'https://outside.example','//outside.example','/store','/assessment/marriage/new/bad','/assessment/marriage/new/'+id+'?replaceRequestId=bad','/assessment/marriage/new/'+id+'?other=yes','/assessment/marriage/new/'+id+'?replaceRequestId='+id+'&replaceRequestId='+id,'/assessment/marriage/requests/'+id+'#x']) expect(marriageProfileReturn(path)).toBeNull();
 });
});
