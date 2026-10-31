import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Prisma, type PatientProfile, type BillingIntent } from '../../../generated/prisma/client';
import { BillingTargetRegistry, type BillingTarget, type PreparedTarget } from '../../billing/billing-target.registry';
import { lockFinancial, type Tx } from '../../billing/billing.policy';
const conflict=()=>new ConflictException({code:'ENTRY_PAYMENT_UNAVAILABLE',message:'Entry price or access is unavailable.',details:{}});
@Injectable()
export class EntryBillingTarget implements BillingTarget, OnModuleInit {
 constructor(private readonly db:PrismaService,private readonly registry:BillingTargetRegistry){}
 onModuleInit(){this.registry.register('ENTRY_ASSESSMENT',this);}
 async prepare(patient:PatientProfile):Promise<PreparedTarget>{return this.db.$transaction(async tx=>{
  await lockFinancial(tx,`patient-entry:${patient.id}`);
  const entry=await tx.patientEntry.findUnique({where:{patientId:patient.id}}),policy=await tx.patientEntryPolicy.findUnique({where:{clinicId:patient.clinicId}});
  if(!entry||entry.completedAt||entry.submissionId||entry.paidIntentId||!policy?.enabled||!policy.assessmentVersionId)throw conflict();
  const source=entry.assessmentVersionId??policy.assessmentVersionId,amount=entry.amountRial??policy.amountRial;
  const [adult]=await tx.$queryRaw<{allowed:boolean}[]>(Prisma.sql`SELECT ${entry.birthDate}::date<=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-INTERVAL '18 years' AS allowed`);
  if(amount<=0n||!adult?.allowed||!await tx.assessmentVersion.count({where:{id:source,clinicId:patient.clinicId,status:'PUBLISHED'}}))throw conflict();
  await tx.patientEntry.update({where:{patientId:patient.id},data:{assessmentVersionId:source,amountRial:amount}});
  const [clock]=await tx.$queryRaw<{expiry:Date}[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+INTERVAL '900 seconds' AS expiry`);
  return {amountRial:amount,expiresAt:clock!.expiry,snapshot:{entryPatientId:patient.id,assessmentVersionId:source,amountRial:amount.toString(),title:'آزمون ورود اولیه'}};
 });}
 async reserve(tx:Tx,patient:PatientProfile,prepared:PreparedTarget){
  await lockFinancial(tx,`patient-entry:${patient.id}`);
  const entry=await tx.patientEntry.findUnique({where:{patientId:patient.id}}),snapshot=prepared.snapshot as {assessmentVersionId:string};
  await lockFinancial(tx,`assessment-purchase:${patient.id}:${snapshot.assessmentVersionId}`);
  const [other]=await tx.$queryRaw<{pending:boolean}[]>(Prisma.sql`SELECT assessment_has_pending_purchase(${patient.id}::uuid,${snapshot.assessmentVersionId}::uuid) AS pending`);
  if(other?.pending||await tx.patientAssessmentSubmission.count({where:{patientId:patient.id,assessmentVersionId:snapshot.assessmentVersionId,state:'IN_PROGRESS'}})||await tx.assessmentAccessGrant.count({where:{patientId:patient.id,assessmentVersionId:snapshot.assessmentVersionId,submission:null,processingConsent:{withdrawnAt:null}}}))throw conflict();
  const [pending]=await tx.$queryRaw<{n:number}[]>(Prisma.sql`SELECT count(*)::int AS n FROM billing_intents i WHERE i.patient_id=${patient.id}::uuid AND i.purpose='ENTRY_ASSESSMENT' AND (i.status='PAID' OR (i.status='PENDING' AND (i.expires_at>CURRENT_TIMESTAMP OR EXISTS(SELECT 1 FROM billing_gateway_attempts a WHERE a.intent_id=i.id AND a.status IN('CREATED','REDIRECT_READY','VERIFYING','REQUIRES_RECONCILIATION')))))`);
  if(!entry||entry.completedAt||entry.paidIntentId||entry.submissionId||entry.amountRial!==prepared.amountRial||entry.assessmentVersionId!==snapshot.assessmentVersionId||pending?.n)throw conflict();
  return {kind:'NONE' as const};
 }
 async lock(tx:Tx,intent:BillingIntent){await lockFinancial(tx,`patient-entry:${intent.patientId}`);await tx.$queryRaw(Prisma.sql`SELECT id FROM assessment_versions WHERE id=${(intent.snapshot as {assessmentVersionId:string}).assessmentVersionId}::uuid FOR SHARE`);}
 async canSettle(tx:Tx,intent:BillingIntent){
  const entry=await tx.patientEntry.findUnique({where:{patientId:intent.patientId}}),source=(intent.snapshot as {assessmentVersionId:string}).assessmentVersionId;
  const [time]=await tx.$queryRaw<{allowed:boolean}[]>(Prisma.sql`SELECT ${intent.expiresAt}::timestamptz>CURRENT_TIMESTAMP AND ${entry?.birthDate??new Date()}::date<=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-INTERVAL '18 years' AS allowed`);
  return !!entry&&!entry.completedAt&&!entry.submissionId&&!entry.paidIntentId&&entry.clinicId===intent.clinicId&&entry.assessmentVersionId===source&&entry.amountRial===intent.amountRial&&!!time?.allowed&&!!await tx.assessmentVersion.count({where:{id:source,clinicId:intent.clinicId,status:'PUBLISHED'}});
 }
 async settle(tx:Tx,intent:BillingIntent){await tx.patientEntry.update({where:{patientId:intent.patientId},data:{paidIntentId:intent.id}});return {kind:'NONE' as const};}
 async refund(){throw conflict();}
}
