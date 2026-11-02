import { describe, expect, it } from 'vitest';
import { validateMarriageDefinition } from '../src/modules/assessments/domain/marriage-service';
const definition = () => ({ version:1 as const,purpose:'MARRIAGE' as const,roles:[{id:'FIRST' as const,title:'First',genders:['MALE' as const],minimumAgeYears:18},{id:'SECOND' as const,title:'Second',genders:['FEMALE' as const],minimumAgeYears:18}],genericJointText:'Authored fallback' });
describe('marriage publication boundaries',()=>{
 it('requires a couple service and retains explicit ordered semantic roles',()=>{ const value=definition(); expect(validateMarriageDefinition(value,'COUPLES')).toBe(value); expect(()=>validateMarriageDefinition(value,'INDIVIDUAL')).toThrow(); });
 it('rejects a minor role or missing fallback before publication',()=>{const value=definition();value.roles[0]!.minimumAgeYears=17;expect(()=>validateMarriageDefinition(value,'COUPLES')).toThrow();value.roles[0]!.minimumAgeYears=18;value.genericJointText=' ';expect(()=>validateMarriageDefinition(value,'COUPLES')).toThrow();});
 it('rejects absent and duplicate allowed genders',()=>{const value=definition();value.roles[0]!.genders=[];expect(()=>validateMarriageDefinition(value,'COUPLES')).toThrow();value.roles[0]!.genders=['MALE','MALE'];expect(()=>validateMarriageDefinition(value,'COUPLES')).toThrow();});
});
