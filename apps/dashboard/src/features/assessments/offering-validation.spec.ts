import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InlineOfferingForm } from './inline-offering-form';
import { MarriageSettings } from './marriage-settings';
import { describe,it,expect,vi } from 'vitest';
import { ageDraft, marriageForPublication, offeringIssues, type MarriageDraft } from './offering-validation';
const marriage=():MarriageDraft=>({version:1,purpose:'MARRIAGE',roles:[{id:'FIRST',title:'آقا',genders:['MALE'],minimumAgeYears:18},{id:'SECOND',title:'خانم',genders:['FEMALE'],minimumAgeYears:18}],genericJointText:'تفسیر عمومی'});
const input=()=>({title:'خدمت',amount:'100000',priceMode:'PAID',kind:'COUPLES',texts:{processing:'p',retention:'r',visibility:'v',terms:'t',disclosure:'d'},marriage:marriage(),questionnaireDirty:false,status:'DRAFT'});
describe('offering publication draft',()=>{
 it('supports clearing and re-entering age without NaN or a fabricated default',()=>{const form=input();form.marriage.roles[0].minimumAgeYears=ageDraft(NaN);expect(form.marriage.roles[0].minimumAgeYears).toBeNull();expect(offeringIssues(form).some(i=>i.field==='age-FIRST')).toBe(true);expect(()=>marriageForPublication(form.marriage)).toThrow();form.marriage.roles[0].minimumAgeYears=ageDraft(18);expect(offeringIssues(form)).toEqual([]);expect(marriageForPublication(form.marriage).roles[0].minimumAgeYears).toBe(18);});
 it.each([null,NaN,17,18.5,121,Infinity])('rejects invalid age %s',age=>{const form=input();form.marriage.roles[1].minimumAgeYears=age;expect(offeringIssues(form).some(i=>i.field==='age-SECOND')).toBe(true);expect(()=>marriageForPublication(form.marriage)).toThrow();});
 it('reports generic interpretation, gender, role title, price, text and unsaved questionnaire separately',()=>{const form=input();form.marriage.genericJointText=' ';form.marriage.roles[0].genders=[];form.marriage.roles[1].title='';form.amount='9000000000000000001';form.texts.terms='';form.questionnaireDirty=true;expect(offeringIssues(form).map(i=>i.field)).toEqual(expect.arrayContaining(['joint-text','genders-FIRST','role-SECOND','amount','terms','questionnaire']));});
 it('does not require marriage fields for an individual offering',()=>{const form={...input(),kind:'INDIVIDUAL',marriage:null};expect(offeringIssues(form)).toEqual([]);});
 it('keeps a blank added pair blocked and accepts the upper price boundary',()=>{const form={...input(),amount:'9000000000000000000',texts:{...input().texts,pairTexts:[{text:' '}]}};expect(offeringIssues(form).map(i=>i.field)).toEqual(['pair-0']);form.texts.pairTexts[0].text='تفسیر';expect(offeringIssues(form)).toEqual([]);});
});

describe('marriage age field rendering',()=>{
 it('renders cleared and restored ages without React NaN warnings',()=>{
  vi.stubGlobal('React',React);
  const error=vi.spyOn(console,'error').mockImplementation(()=>{});
  try {
   const value=marriage();value.roles[0].minimumAgeYears=ageDraft(NaN);
   const cleared=renderToStaticMarkup(React.createElement(MarriageSettings,{value,onChange:()=>{},disabled:false}));
   expect(cleared).toContain('value=""');expect(cleared).not.toContain('value="NaN"');expect(cleared).toContain('age-FIRST-error');
   value.roles[0].minimumAgeYears=18;
   const restored=renderToStaticMarkup(React.createElement(MarriageSettings,{value,onChange:()=>{},disabled:false}));
   expect(restored).toContain('value="18"');expect(error).not.toHaveBeenCalled();
  } finally {error.mockRestore();vi.unstubAllGlobals();}
 });
});

it('uses the same validation to disable incomplete publication and enable a complete couple form',()=>{
 vi.stubGlobal('React',React);
 try {
  const form=input();
  const seed={title:form.title,amountRial:form.amount,kind:'COUPLES',authoringTexts:{...form.texts,marriage:form.marriage}};
  const render=()=>renderToStaticMarkup(React.createElement(InlineOfferingForm,{token:'synthetic',version:{id:'test',status:'DRAFT',structure:{}} as never,seed:seed as never,questionnaireDirty:false,onPublished:()=>{},onSaved:()=>{},onBusy:()=>{}}));
  seed.authoringTexts.marriage.roles[0].minimumAgeYears=null;
  expect(render().match(/<button[^>]*>انتشار آزمون و عرضه/)?.[0]).toContain('disabled');
  seed.authoringTexts.marriage.roles[0].minimumAgeYears=18;
  expect(render().match(/<button[^>]*>انتشار آزمون و عرضه/)?.[0]).not.toContain('disabled');
 } finally {vi.unstubAllGlobals();}
});
