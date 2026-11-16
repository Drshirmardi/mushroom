import { describe, it, expect, vi } from 'vitest';
import { PatientAssessmentsService } from '../src/modules/assessments/patient/patient-assessments.service';
import type { PrismaService } from '../src/database/prisma/prisma.service';
import type { AssessmentAccessService } from '../src/modules/assessments/access/assessment-access.service';

describe('assessment history invitation projection',()=>{
 it('uses only the attempt grant context, excludes internal joins and keeps patient/clinic scope',async()=>{
  const version={assessmentKey:'A',versionNumber:1,locale:'fa-IR',title:'Owned',status:'PUBLISHED'};
  const row=(id:string,request:object|null)=>({id,accessGrantId:'grant',assessmentVersion:version,state:'IN_PROGRESS',invalidatedAt:null,accessGrant:request?{educationalCoupleParticipant:{session:{marriageRequest:request}}}:null});
  const findMany=vi.fn().mockResolvedValue([row('individual',null),row('couple',{id:'exact-request',clinicId:'clinic'}),row('foreign',{id:'foreign-request',clinicId:'other'})]);
  const tx={patientProfile:{findUnique:vi.fn().mockResolvedValue({id:'patient',clinicId:'clinic'})},patientAssessmentSubmission:{findMany,count:vi.fn().mockResolvedValue(3)},$queryRaw:vi.fn().mockResolvedValue([{id:'grant'}]),auditEvent:{create:vi.fn()}};
  const prisma={$transaction:async(fn:(tx:unknown)=>unknown)=>fn(tx)} as unknown as PrismaService;
  const service=new PatientAssessmentsService(prisma,{} as AssessmentAccessService);
  const result=await service.history('user',{page:1,pageSize:20,state:'IN_PROGRESS'},{actorUserId:'user',actorSessionId:'session',requestId:'request',ipAddress:'127.0.0.1'});
  expect(result.items.map(x=>x.marriageRequestId)).toEqual([null,'exact-request',null]);
  for(const item of result.items){expect(item).not.toHaveProperty('accessGrant');expect(item).not.toHaveProperty('accessGrantId');}
  expect(findMany.mock.calls[0]![0].where).toMatchObject({patientId:'patient',assessmentVersion:{clinicId:'clinic'},state:'IN_PROGRESS'});
 });
});
