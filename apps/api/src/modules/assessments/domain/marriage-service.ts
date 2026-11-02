import { UnprocessableEntityException } from '@nestjs/common';

export type MarriageRole = { id: 'FIRST' | 'SECOND'; title: string; genders: ('MALE' | 'FEMALE')[]; minimumAgeYears: number };
export type MarriageDefinition = { version: 1; purpose: 'MARRIAGE'; roles: MarriageRole[]; genericJointText: string };
const invalid = () => new UnprocessableEntityException({ code: 'MARRIAGE_CONFIGURATION_INVALID', message: 'Complete two distinct adult roles and the shared interpretation.', details: {} });

export function validateMarriageDefinition(value: MarriageDefinition, kind: string): MarriageDefinition {
  if (kind !== 'COUPLES' || value.version !== 1 || value.purpose !== 'MARRIAGE' || !Array.isArray(value.roles) || value.roles.length !== 2 || value.roles[0]?.id !== 'FIRST' || value.roles[1]?.id !== 'SECOND' || typeof value.genericJointText !== 'string' || !value.genericJointText.trim() || value.genericJointText.length > 20000) throw invalid();
  for (const role of value.roles) {
    if (typeof role.title !== 'string' || !role.title.trim() || role.title.length > 100 || !Number.isInteger(role.minimumAgeYears) || role.minimumAgeYears < 18 || role.minimumAgeYears > 120 || !Array.isArray(role.genders) || !role.genders.length || role.genders.length > 2 || new Set(role.genders).size !== role.genders.length || role.genders.some(gender => !['MALE', 'FEMALE'].includes(gender))) throw invalid();
  }
  return value;
}

export function marriageDefinition(texts: unknown): MarriageDefinition | null {
  const definition = texts && typeof texts === 'object' ? (texts as { marriage?: MarriageDefinition }).marriage : undefined;
  return definition ? validateMarriageDefinition(definition, 'COUPLES') : null;
}
