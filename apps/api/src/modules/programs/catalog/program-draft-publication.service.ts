import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Prisma } from '../../../generated/prisma/client';
import type { GuidanceActorContext as Context } from '../../content/guidance/guidance-authority.service';
import { ProgramPublicationService } from '../publication/program-publication.service';
import { ensureReadyProgramTerms } from '../publication/ready-program-terms';
import { catalogConflict, catalogInvalid, ProgramServicesService } from './program-services.service';
import type { DraftPublicationApplyDto, DraftPublicationPreviewRequestDto, DraftPublicationResultDto, DraftCommercialDto } from './program-draft-publication.dto';
type Stored = DraftPublicationResultDto & {revision:number; draftHash:string; publicationNumber:number; termsHash:string; configuration:DraftCommercialDto};
type Snapshot = {purpose:'DRAFT_PUBLICATION';items:Stored[]};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class ProgramDraftPublicationService {
  constructor(private readonly services:ProgramServicesService,private readonly publications:ProgramPublicationService){}
  private failure(error:unknown,serviceId:string):DraftPublicationResultDto {
    if(!(error instanceof HttpException)||error.getStatus()>=500||[401,403].includes(error.getStatus()))throw error;
    const body=error.getResponse();return {serviceId,title:'',ready:false,code:typeof body==='object'&&'code' in body?String(body.code):'PROGRAM_SERVICE_INVALID'};
  }
  async preview(input:DraftPublicationPreviewRequestDto,ctx:Context){
    if(new Set(input.items.map(i=>i.serviceId)).size!==input.items.length)throw catalogInvalid();
    const stored:Stored[]=[],items:DraftPublicationResultDto[]=[];
    for(const item of input.items){try{
      const value=await this.services.scoped(ctx,async(tx,clinicId)=>{
        const row=await this.services.owned(tx,clinicId,item.serviceId,item.expectedRevision);
        if(row.archivedAt)throw catalogConflict();
        const draft=await this.services.validateDraft(row);
        const latest=await tx.programOfferingPublication.findFirst({where:{clinicId,programKey:row.programKey,locale:row.locale},orderBy:{publicationNumber:'desc'}});
        const previous=row.publishedDefinitionId?await tx.programDefinitionVersion.findUnique({where:{id:row.publishedDefinitionId}}):null;
        const safety={intendedAudience:draft.safety?.intendedAudience?.trim()??'',limitations:draft.safety?.limitations?.trim()??'',seekProfessionalCare:draft.safety?.seekProfessionalCare?.trim()??'',contraindications:draft.safety?.contraindications??[]};
        const contentChanged=!previous||previous.title!==draft.title.trim()||previous.body!==draft.body.trim()||previous.summary!==(draft.summary?.trim()??'')||previous.category!==draft.category.trim()||previous.eligibilityDescription!==(draft.eligibilityDescription?.trim()??'')||!isDeepStrictEqual(previous.safety,safety);
        const metadata=row.draft as {pairs?:string[]};
        const configuration={...item.configuration};
        const terms=configuration.termsPolicyVersionId?await tx.consentPolicyVersion.findFirst({where:{id:configuration.termsPolicyVersionId,clinicId,locale:row.locale,status:'ACTIVE',activatedAt:{not:null},policyKey:{in:configuration.accessMode==='PERPETUAL'?['PROGRAM_PURCHASE_TERMS','READY_PROGRAM_PURCHASE_TERMS']:['PROGRAM_PURCHASE_TERMS']}}}):configuration.accessMode==='PERPETUAL'?await ensureReadyProgramTerms(tx,clinicId,row.locale,ctx.actorUserId):null;
        if(!terms)throw catalogInvalid();
        configuration.termsPolicyVersionId=terms.id;
        // Validate commercial settings through the same normalization as single publication.
        this.publications.validateCommercial({...configuration,programDefinitionId:row.id});
        return {serviceId:row.id,title:draft.title,summary:draft.summary??'',category:draft.category,audience:row.audience,pairs:metadata.pairs??[],contentChanged,ready:true,revision:row.revision,draftHash:digest(row.draft),publicationNumber:latest?.publicationNumber??0,termsHash:terms.contentHash,termsBody:terms.body,configuration};
      });stored.push(value);items.push(value);
    }catch(error){items.push(this.failure(error,item.serviceId));}}
    return this.services.scoped(ctx,async(tx,clinicId)=>{
      const [clock]=await tx.$queryRaw<{expires:Date}[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP+INTERVAL '30 minutes' AS expires`);
      const row=await tx.programImportPreview.create({data:{clinicId,actorUserId:ctx.actorUserId,bundleHash:digest(stored),snapshot:json({purpose:'DRAFT_PUBLICATION',items:stored}),expiresAt:clock.expires}});
      await this.services.audit(tx,ctx,'DRAFT_PUBLICATION_PREVIEWED',row.id);return {id:row.id,expiresAt:row.expiresAt,items};
    });
  }
  async apply(id:string,input:DraftPublicationApplyDto,ctx:Context){
    if(new Set(input.serviceIds).size!==input.serviceIds.length)throw catalogInvalid();
    const items:DraftPublicationResultDto[]=[];
    for(const serviceId of input.serviceIds){try{items.push(await this.services.scoped(ctx,async(tx,clinicId)=>{
      const preview=await tx.programImportPreview.findFirst({where:{id,clinicId,actorUserId:ctx.actorUserId}});
      if(!preview)throw catalogInvalid();
      const snapshot=preview.snapshot as unknown as Snapshot;
      if(snapshot.purpose!=='DRAFT_PUBLICATION')throw catalogInvalid();
      const item=snapshot.items.find(i=>i.serviceId===serviceId);if(!item)throw catalogInvalid();
      const receipt=await tx.programImportReceipt.findUnique({where:{previewId_programKey:{previewId:id,programKey:serviceId}}});
      if(receipt)return receipt.result as unknown as DraftPublicationResultDto;
      const [clock]=await tx.$queryRaw<{now:Date}[]>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
      if(clock.now>=preview.expiresAt)throw catalogConflict();
      const row=await this.services.owned(tx,clinicId,serviceId,item.revision);
      if(row.archivedAt||digest(row.draft)!==item.draftHash)throw catalogConflict();
      const terms=await tx.consentPolicyVersion.findFirst({where:{id:item.configuration.termsPolicyVersionId,clinicId,status:'ACTIVE',contentHash:item.termsHash}});if(!terms)throw catalogConflict();
      const definition=await this.services.submitInTransaction(tx,row,ctx);
      const config={...item.configuration,programDefinitionId:definition.id,expectedServiceRevision:item.revision};
      // Existing preview and publish perform all lifecycle, terms, locks and money checks.
      const checked=await this.publications.preview(config,ctx,tx);
      if(!checked.configurationReady||!checked.publicationHash||checked.expectedPublicationNumber!==item.publicationNumber)throw catalogConflict();
      await this.publications.publish({...config,publicationHash:checked.publicationHash,expectedPublicationNumber:item.publicationNumber,reviewedTermsAndRetention:true},`draft-publish:${id}:${serviceId}`,ctx,tx);
      const result={serviceId,title:item.title,ready:true,published:true};
      await tx.programImportReceipt.create({data:{previewId:id,programKey:serviceId,payloadHash:digest(item),result:json(result)}});
      await this.services.audit(tx,ctx,'DRAFT_PUBLISHED',serviceId);return result;
    }));}catch(error){items.push(this.failure(error,serviceId));}}
    return {items};
  }
}
