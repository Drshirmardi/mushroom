import type { Prisma } from '../../../generated/prisma/client';

export class AssessmentAnswerError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

type ObjectValue = Record<string, Prisma.InputJsonValue>;
type Question = ObjectValue & { id: string; type: string; required?: boolean };

const object = (value: unknown): ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : {};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const fail = (message: string): never => { throw new AssessmentAnswerError('ASSESSMENT_ANSWERS_INVALID', message); };

export const scoreAssessment = (structureInput: unknown, answersInput: unknown) => {
  const structure = object(structureInput);
  const answers = object(answersInput);
  const sections = Array.isArray(structure.sections) ? structure.sections : fail('Assessment structure has no sections.');
  const questions: Question[] = [];
  for (const section of sections) {
    const sectionValue = object(section);
    if (!Array.isArray(sectionValue.questions)) fail('Assessment section has no questions.');
    for (const question of sectionValue.questions as unknown[]) {
      const questionValue = object(question);
      if (typeof questionValue.id !== 'string' || typeof questionValue.type !== 'string') fail('Assessment question is invalid.');
      questions.push(questionValue as Question);
    }
  }
  const ids = new Set(questions.map((question) => question.id));
  for (const id of Object.keys(answers)) if (!ids.has(id)) fail(`Answer ${id} is not part of this assessment.`);
  let score = 0;
  for (const question of questions) score += scoreQuestion(question, answers[question.id]);
  const resultBand = selectBand(structure.resultBands, score);
  return { score, resultBand, answers };
};

const scoreQuestion = (question: Question, answer: unknown): number => {
  if (answer === undefined || answer === null) { if (question.required) fail(`Answer ${question.id} is required.`); return 0; }
  if (question.type === 'TEXT') { const maxLength = question.maxLength as number; if (typeof answer !== 'string' || answer.trim() !== answer || !Number.isInteger(maxLength) || answer.length > maxLength) fail(`Text answer ${question.id} is invalid.`); return 0; }
  if (question.type === 'BOOLEAN') { if (typeof answer !== 'boolean' || !finite(answer ? question.trueScore : question.falseScore)) fail(`Boolean answer ${question.id} is invalid.`); return answer ? question.trueScore as number : question.falseScore as number; }
  if (question.type === 'NUMBER') { if (!finite(answer)) fail(`Number answer ${question.id} is invalid.`); const numericAnswer = answer as number; const min = question.min as unknown; const max = question.max as unknown; if (finite(min) && numericAnswer < min || finite(max) && numericAnswer > max) fail(`Number answer ${question.id} is out of range.`); const ranges = Array.isArray(question.scoreRanges) ? question.scoreRanges.map(object) : []; const matching = ranges.filter((range) => { const rangeMin = range.minInclusive as unknown; const rangeMax = range.maxExclusive as unknown; return finite(rangeMin) && finite(range.score) && numericAnswer >= rangeMin && (!finite(rangeMax) || numericAnswer < rangeMax); }); if (ranges.length && matching.length !== 1) fail(`Number answer ${question.id} has no unique score range.`); return matching.length ? matching[0].score as number : 0; }
  const options = Array.isArray(question.options) ? question.options.map(object) : fail(`Choice question ${question.id} has no options.`);
  const optionScores = new Map(options.map((option) => [option.id, option.score]));
  const selected = question.type === 'SINGLE_CHOICE' ? [answer] : question.type === 'MULTIPLE_CHOICE' && Array.isArray(answer) ? answer : fail(`Choice answer ${question.id} is invalid.`);
  if ((question.type === 'SINGLE_CHOICE' && selected.length !== 1) || new Set(selected).size !== selected.length) fail(`Choice answer ${question.id} is invalid.`);
  let score = 0;
  for (const optionId of selected) { if (typeof optionId !== 'string' || !finite(optionScores.get(optionId))) fail(`Choice answer ${question.id} is invalid.`); score += optionScores.get(optionId) as number; }
  return score;
};

const selectBand = (value: unknown, score: number) => {
  if (value === undefined) return null;
  if (!Array.isArray(value)) fail('Assessment result bands are invalid.');
  const matches = (value as unknown[]).map(object).filter((band) => { const min = band.minInclusive as unknown; const max = band.maxExclusive as unknown; return typeof band.id === 'string' && typeof band.title === 'string' && finite(min) && score >= min && (!finite(max) || score < max); });
  if (matches.length !== 1) fail('Assessment score has no unique result band.');
  return { id: matches[0].id as string, title: matches[0].title as string };
};
