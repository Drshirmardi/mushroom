import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { PatientEntryGuard } from '../src/modules/patients/entry/patient-entry.guard';
import type { PatientEntryService } from '../src/modules/patients/entry/patient-entry.service';
const id='11111111-1111-4111-8111-111111111111';
const context = (url: string) => ({ switchToHttp: () => ({ getRequest: () => ({ url, method: 'GET', auth: { userId:id,roles:['PATIENT'] } }) }) }) as unknown as ExecutionContext;
function guard(phase='RESULT') { return new PatientEntryGuard({ status:async()=>({required:true,phase,submissionId:id}) } as unknown as PatientEntryService); }
describe('entry result recommendations remain bound to the completed entry result',()=>{
  it('permits read-only suggestions for this result before acknowledging entry',async()=>{for(const endpoint of ['program-recommendations','commerce/recommendations']) expect(await guard().canActivate(context(`/v1/patients/me/${endpoint}?submissionId=${id}`))).toBe(true);});
  it('rejects other/missing results, profile phase and paid content before entry completes',async()=>{
    for(const url of ['/v1/patients/me/program-recommendations','/v1/patients/me/program-recommendations?submissionId=22222222-2222-4222-8222-222222222222',`/v1/patients/me/program-access-grants/${id}/content`])await expect(guard().canActivate(context(url))).rejects.toMatchObject({response:{code:'PATIENT_ENTRY_REQUIRED'}});
    await expect(guard('PROFILE').canActivate(context(`/v1/patients/me/program-recommendations?submissionId=${id}`))).rejects.toMatchObject({response:{code:'PATIENT_ENTRY_REQUIRED'}});
  });
});
