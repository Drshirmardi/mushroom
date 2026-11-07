// Synthetic API for dashboard browser tests. No request reaches a real clinic.
import assert from 'node:assert/strict';
export const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:3002';
export async function installProgramFixture(page) {
  const id = '11111111-1111-4111-8111-111111111111', categoryId = '22222222-2222-4222-8222-222222222222', definitionId = '33333333-3333-4333-8333-333333333333';
  const terms = { id:'44444444-4444-4444-8444-444444444444',title:'شرایط خرید آزمایشی',body:'متن شرایط خرید',policyKey:'READY_PROGRAM_PURCHASE_TERMS',versionNumber:1,locale:'fa-IR',contentHash:'b'.repeat(64) };
  const draft = {title:'خدمت آزمایشی',summary:'معرفی آموزشی',body:'متن خصوصی خدمت',category:'آموزش',audience:'SHARED',pairs:['damavi/safravi'],eligibilityDescription:'مطالعهٔ شخصی',safety:{intendedAudience:'بزرگسالان',limitations:'آموزشی',contraindications:[],seekProfessionalCare:'مراجعه به متخصص'}};
  const definition = {id:definitionId,programKey:'TEXT_TEST',locale:'fa-IR',versionNumber:1,kind:'READY_EDUCATION',...draft,status:'APPROVED',usable:true,contentHash:'a'.repeat(64),contentReferences:[]};
  const state = {root:{id,programKey:'TEXT_TEST',locale:'fa-IR',revision:1,draft,audience:'SHARED',categoryId,publishedDefinitionId:definitionId,baseAmountRial:'1500001',discountPercent:0,discountStartsAt:null,discountEndsAt:null,sellingEnabled:true,archivedAt:null},categories:[{id:categoryId,key:'EDUCATION',name:'آموزش',active:true,revision:1}],definition,terms,publication:{id,programDefinitionId:definitionId,amountRial:'1500001',discountPercent:0,discountStartsAt:null,discountEndsAt:null,status:'ACTIVE',configurationReady:true,accessMode:'DAYS',accessDurationDays:30,quoteTtlSeconds:600,termsPolicyVersionId:terms.id,retentionPolicyRef:'REVIEWED_TEST',publicationNumber:1},preview:null,published:null,saved:null,applied:null,conflict:false,blocked:false,loadError:false,missingTerms:false};
  const preview = configuration => ({configuration,definition:state.definition,termsPolicy:state.missingTerms?null:terms,configurationReady:!state.blocked&&!state.missingTerms,publicationHash:state.blocked||state.missingTerms?null:'c'.repeat(64),expectedPublicationNumber:state.publication.publicationNumber,blockers:state.blocked?['PROGRAM_CLINICAL_DEFINITION_UNAVAILABLE']:state.missingTerms?['PROGRAM_PURCHASE_TERMS_UNAVAILABLE']:[]});
  const publish = body => {
    state.published=body;
    state.publication={...state.publication,...body,publicationNumber:state.publication.publicationNumber+1};
    Object.assign(state.root,{baseAmountRial:body.amountRial,discountPercent:body.discountPercent,discountStartsAt:body.discountStartsAt,discountEndsAt:body.discountEndsAt,sellingEnabled:true,revision:state.root.revision+1});
    return state.publication;
  };
  await page.route('**/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),origin=req.headers().origin??dashboardUrl;
    const cors={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'authorization,content-type,idempotency-key'};
    const send=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(value)});
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(path==='/v1/auth/refresh')return send({accessToken:'synthetic',tokenType:'Bearer',expiresIn:600,user:{id,phone:'+989000000000',roles:['ADMIN','DOCTOR']}});
    if(path==='/v1/admin/program-services'&&method==='GET') {const filter=url.searchParams.get('state');const items=filter==='ARCHIVED'?!state.root.archivedAt?[]:[state.root]:filter==='ALL'?[state.root]:state.root.archivedAt?[]:[state.root];return send({items,total:items.length,page:1,pageSize:20});}
    if(path===`/v1/admin/program-services/${id}`)return send(state.root);
    if(path===`/v1/admin/program-services/${id}/draft`){const body=req.postDataJSON();if(state.conflict||body.expectedRevision!==state.root.revision)return send({code:'PROGRAM_SERVICE_CONFLICT'},409);state.saved=body;Object.assign(state.root,{draft:body.draft,audience:body.draft.audience,categoryId:body.categoryId,revision:state.root.revision+1});return send(state.root);}
    if(path===`/v1/admin/program-services/${id}/archive`||path===`/v1/admin/program-services/${id}/restore`){state.root.archivedAt=path.endsWith('/archive')?new Date().toISOString():null;state.root.sellingEnabled=false;state.root.revision++;return send(state.root);}
    if(path==='/v1/admin/program-definitions')return send({items:[state.definition],total:1,page:1,pageSize:50});
    if(path===`/v1/admin/program-definitions/${definitionId}`)return send(state.definition);
    if(path==='/v1/admin/program-categories'&&method==='GET')return send({items:state.categories});
    if(path==='/v1/admin/program-categories'&&method==='POST'){const body=req.postDataJSON();state.categories.push({...body,id:'55555555-5555-4555-8555-555555555555',revision:1,active:true});return send(state.categories.at(-1),201);}
    if(path.startsWith('/v1/admin/program-categories/')) {const body=req.postDataJSON(),category=state.categories.find(c=>path.endsWith(c.id));assert.ok(category);Object.assign(category,body,{revision:category.revision+1});return send(category);}
    if(path===`/v1/admin/program-offerings/setup/${definitionId}`)return state.loadError?send({code:'UNAVAILABLE'},503):send({latestPublication:state.publication,defaultTerms:terms,termsPolicy:terms,suggestedRetentionPolicyRef:'REVIEWED_TEST'});
    if(path==='/v1/admin/program-offerings/preview'){state.preview=req.postDataJSON();return send(preview(state.preview));}
    if(path==='/v1/admin/program-offerings'&&method==='POST'){assert.ok(req.headers()['idempotency-key']);if(state.conflict)return send({code:'PROGRAM_PUBLICATION_CONFLICT'},409);return send(publish(req.postDataJSON()),201);}
    if(path==='/v1/admin/program-offerings/bulk-preview')return send({items:req.postDataJSON().items.map(c=>({programDefinitionId:c.programDefinitionId,preview:preview(c)}))});
    if(path==='/v1/admin/program-offerings/bulk-publish')return send({items:req.postDataJSON().items.map(item=>{assert.ok(item.key);return {programDefinitionId:item.configuration.programDefinitionId,publication:publish(item.configuration)};})});
    if(path==='/v1/admin/program-catalog')return send({bundleHash:'d'.repeat(64),items:[{key:'UI_IMPORT:fa-IR',title:'منبع آزمایشی',category:'آموزش',audience:'REVIEW_REQUIRED',baseAmountRial:'2500000',reviewRequired:true,sourceCount:1}]});
    if(path==='/v1/admin/program-catalog/preview')return send({id:'66666666-6666-4666-8666-666666666666',bundleHash:'d'.repeat(64),expiresAt:new Date(Date.now()+600000).toISOString(),items:[{key:'UI_IMPORT:fa-IR',serviceId:id,expectedRevision:state.root.revision,state:'CONFLICT',conflicts:['body'],current:draft,incoming:{...draft,body:'متن تازهٔ منبع'}}]});
    if(path.endsWith('/apply')){state.applied=req.postDataJSON();return send({items:[{key:'UI_IMPORT:fa-IR',state:'APPLIED',serviceId:id}]});}
    if(path.startsWith('/v1/admin/program-')||path.startsWith('/v1/clinical/program-')) throw new Error(`Unmocked programs request: ${method} ${path}`);
    return send({items:[],total:0,unreadCount:0});
  });
  return state;
}
export async function openProgramEditor(page) {
  await page.goto(`${dashboardUrl}/programs`);
  await page.getByRole('button',{name:'مدیریت',exact:true}).click();
  await page.getByLabel('نام خدمت',{exact:true}).waitFor();
}
export async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const dialog=page.getByRole('dialog');
  if(await dialog.count())assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false);
}
