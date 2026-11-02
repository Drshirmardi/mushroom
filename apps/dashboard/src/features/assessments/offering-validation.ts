import type { components } from '@sabz-zendegi/api-client';
type Definition = components['schemas']['MarriageDefinitionDto'];
export type MarriageDraft = Omit<Definition,'roles'> & { roles: (Omit<Definition['roles'][number],'minimumAgeYears'> & { minimumAgeYears: number|null })[] };
export type Issue = { field: string; message: string };
export const ageDraft = (value: number): number|null => Number.isFinite(value) ? value : null;
export function marriageIssues(value: MarriageDraft|null): Issue[] {
 if (!value) return [{field:'marriage',message:'شرایط خدمت ازدواج را تکمیل کنید.'}];
 const issues: Issue[]=[];
 if(value.roles.length!==2 || value.roles[0]?.id!=='FIRST' || value.roles[1]?.id!=='SECOND') issues.push({field:'marriage',message:'دو نقش متمایز خدمت را تکمیل کنید.'});
 for(const role of value.roles){
  const name=role.title.trim() || (role.id==='FIRST'?'اول':'دوم');
  if(!role.title.trim()) issues.push({field:`role-${role.id}`,message:`عنوان نقش ${name} را بنویسید.`});
  if(role.minimumAgeYears===null || !Number.isFinite(role.minimumAgeYears)) issues.push({field:`age-${role.id}`,message:`حداقل سن نقش ${name} را وارد کنید.`});
  else if(!Number.isInteger(role.minimumAgeYears) || role.minimumAgeYears<18 || role.minimumAgeYears>120) issues.push({field:`age-${role.id}`,message:`سن نقش ${name} باید عدد صحیح بین ۱۸ تا ۱۲۰ باشد.`});
  if(!role.genders.length) issues.push({field:`genders-${role.id}`,message:`جنسیت مجاز نقش ${name} را انتخاب کنید.`});
 }
 if(!value.genericJointText.trim()) issues.push({field:'joint-text',message:'تفسیر عمومی مشترک را بنویسید.'});
 return issues;
}
export function marriageForPublication(value: MarriageDraft): Definition {
 if(marriageIssues(value).length) throw new Error('Incomplete marriage settings');
 return {...value,roles:value.roles.map(role=>({...role,minimumAgeYears:role.minimumAgeYears!}))};
}
export function offeringIssues(input: {title:string;amount:string;priceMode:string;kind:string;texts:Record<string,unknown>;marriage:MarriageDraft|null;questionnaireDirty:boolean;status:string}): Issue[]{
 const issues:Issue[]=[];
 if(input.questionnaireDirty) issues.push({field:'questionnaire',message:'تغییرهای پرسش‌نامه را ابتدا ذخیره کنید.'});
 if(!['DRAFT','PUBLISHED'].includes(input.status)) issues.push({field:'questionnaire',message:'برای این وضعیت پرسش‌نامه امکان انتشار عرضه وجود ندارد.'});
 if(!input.title.trim()) issues.push({field:'offering-title',message:'عنوان عرضه را بنویسید.'});
 if(input.priceMode==='PAID' && (!/^[1-9][0-9]{0,18}$/.test(input.amount) || BigInt(input.amount)>9000000000000000000n)) issues.push({field:'amount',message:'مبلغ را به ریال، به‌صورت عدد صحیح مثبت در محدودهٔ مجاز وارد کنید.'});
 const labels:Record<string,string>={processing:'رضایت پردازش',retention:'نگهداری اطلاعات',visibility:'نمایش نتیجه',terms:'شرایط خرید',disclosure:'اشتراک نتیجه زوجین'};
 for(const key of ['processing','retention','visibility',...(input.priceMode==='PAID'?['terms']:[]),...(input.kind==='COUPLES'?['disclosure']:[])]) if(typeof input.texts[key]!=='string' || !(input.texts[key] as string).trim()) issues.push({field:key,message:`متن ${labels[key]} را تکمیل کنید.`});
 if(input.kind==='COUPLES'){
  issues.push(...marriageIssues(input.marriage));
  const pairs=input.texts.pairTexts as {text:string}[]|undefined;
  pairs?.forEach((pair,index)=>{if(!pair.text.trim()) issues.push({field:`pair-${index}`,message:`متن اختصاصی ترکیب ${index+1} را تکمیل یا آن ترکیب را حذف کنید.`});});
 }
 return issues;
}
