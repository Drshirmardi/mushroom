import { describe, expect, it } from 'vitest';
import { candidateKey, createMizajTieBreakDraft, newFollowUp, tieCases, validateMizajAuthoring, validateMizajPublication } from './mizaj-authoring';
import { QUESTION_TEXT_MAX_LENGTH, row, rows, validateAuthoring } from './assessment-authoring';

describe('Mizaj authoring contract', () => {
  it('accepts long Persian questions and identifies the main or follow-up limit before saving', () => {
    const dimensions = ['a', 'b', 'c', 'd'].map(id => ({ id, title: id }));
    const title = 'س'.repeat(QUESTION_TEXT_MAX_LENGTH);
    const followUp = { id: 'followup', title, tiedDimensions: ['a', 'b'], options: ['a', 'b'].map(dimensionId => ({ id: dimensionId, title: 'پاسخ', dimensionId })) };
    const structure = { schemaVersion: 3, scoring: { dimensions, minInformativeAnswers: 1 }, sections: [{ id: 'main', title: 'بخش', questions: Array.from({ length: 11 }, (_, index) => ({ id: `q${index}`, title, type: 'SINGLE_CHOICE', required: true, options: dimensions.map(dimension => ({ id: dimension.id, title: 'پاسخ', scores: { [dimension.id]: 1 } })) })) }], followUps: [followUp], resultProfiles: [] };
    expect(validateAuthoring(structure)).toEqual([]);
    expect(validateMizajAuthoring(structure)).toEqual([]);
    structure.sections[0]!.questions[0]!.title += 'س';
    expect(validateAuthoring(structure).some(issue => issue.includes('۲۰٬۰۰۰'))).toBe(true);
    followUp.title += 'س';
    expect(validateMizajAuthoring(structure)).toContain('متن سؤال رفع تساوی حداکثر ۲۰٬۰۰۰ نویسه دارد.');
  });
  it('creates a separate 11+1 draft without mutating or relabeling the original object', () => {
    const source = { schemaVersion: 2, scoring: { algorithmId: 'DIMENSION_RANK', algorithmVersion: 1 }, sections: [], source: { sha256: 'original' } };
    const before = structuredClone(source); const draft = createMizajTieBreakDraft(source);
    expect(source).toEqual(before);
    expect(draft.schemaVersion).toBe(3);
    expect(row(draft.scoring).algorithmId).toBe('DIMENSION_TIEBREAK');
    expect(rows(draft.followUps)).toHaveLength(6);
  });
  it('seeds the six exact pair questions and answer-to-dimension mappings', () => {
    const dimensionIds = ['DAMAVI', 'SAFRAVI', 'BALGHAMI', 'SODAVI'];
    const source = {
      schemaVersion: 2,
      scoring: { dimensions: dimensionIds.map(id => ({ id, title: id })), minInformativeAnswers: 5 },
      sections: [{ id: 'mizaj', title: 'پرسش‌های مزاج‌شناسی', questions: Array.from({ length: 11 }, (_, index) => ({
        id: `q${index + 1}`, title: `سؤال ${index + 1}`, type: 'SINGLE_CHOICE', required: true,
        options: dimensionIds.map((id, optionIndex) => ({ id: `o${optionIndex + 1}`, title: `پاسخ ${optionIndex + 1}`, scores: { [id]: 1 } })),
      })) }],
    };
    const draft = createMizajTieBreakDraft(source);
    const followUps = rows(draft.followUps);
    expect(validateMizajPublication(draft)).toEqual([]);
    expect(followUps.map(question => candidateKey(question.tiedDimensions as string[]))).toEqual([
      'DAMAVI:SAFRAVI', 'BALGHAMI:DAMAVI', 'BALGHAMI:SAFRAVI', 'DAMAVI:SODAVI', 'SAFRAVI:SODAVI', 'BALGHAMI:SODAVI',
    ]);
    expect(followUps.map(question => question.title)).toEqual([
      'آیا میزان علاقمندی شما به خوردن شیرینی بیشتر است یا ترشی؟',
      'آیا بعد از بیداری از خواب احساس سرحالی دارید یا عدم رفع خستگی ؟',
      'میزان اتش شما نسبت به خوردن آب آشامیدنی چقدر است؟',
      'رنگ پوست یا جسه شما چگونه است ؟',
      'رنگ صورت شما چگونه است ؟',
      'میزان علاقمندی شما نسبت به آشامیدن آب چقدر است ؟',
    ]);
    expect(followUps.map(question => rows(question.options).map(option => [option.title, option.dimensionId]))).toEqual([
      [['علاقه به خوردن شیرینی دارم', 'DAMAVI'], ['علاقه به خوردن ترشی دارم', 'SAFRAVI']],
      [['بعد از بیداری احساس سرحالی دارم', 'DAMAVI'], ['بعد از بیداری احساس عدم رفع خستگی دارم', 'BALGHAMI']],
      [['میل زیادی به آشامیدن آب دارم', 'SAFRAVI'], ['میلی به آشامیدن آب ندارم', 'BALGHAMI']],
      [['رنگ پوستی گلگون و قرمزی دارم', 'DAMAVI'], ['جسه چاق و هیکلی دارم', 'DAMAVI'], ['رنگ تیره ای دارم', 'SODAVI'], ['جسه ای لاغر دارم', 'SODAVI']],
      [['رنگ صورتم زرد و یا گندمی است', 'SAFRAVI'], ['رنگ صورتم تیره و یا پرخال است', 'SODAVI']],
      [['علاقه به خوردن آب آشامیدنی ندارم', 'BALGHAMI'], ['علاقه زیادی به خوردن آب آشامیدنی دارم', 'SODAVI']],
    ]);
  });
  it('has six pair cases and distinct exact cases for all larger ties', () => {
    const cases = tieCases(['a', 'b', 'c', 'd']);
    expect(cases.filter(item => item.length === 2)).toHaveLength(6);
    expect(cases).toHaveLength(11);
    expect(candidateKey(['a', 'b'])).toBe(candidateKey(['b', 'a']));
  });
  it('requires every pair-case question for publication while keeping draft saves possible', () => {
    const dimensions = ['a', 'b', 'c', 'd'].map(id => ({ id, title: id }));
    const structure = { schemaVersion: 3, scoring: { dimensions }, sections: [], followUps: [] as unknown[] };
    expect(validateMizajPublication(structure).filter(issue => issue.startsWith('سؤال رفع تساوی «'))).toHaveLength(6);
    structure.followUps = tieCases(dimensions.map(item => item.id)).filter(ids => ids.length === 2).map(ids => newFollowUp([...ids].reverse()));
    expect(validateMizajPublication(structure).filter(issue => issue.startsWith('سؤال رفع تساوی «'))).toHaveLength(0);
    // Missing text is still rejected; defining a case never invents a question or approval.
    expect(validateMizajPublication(structure).length).toBeGreaterThan(0);
  });
  it('does not fabricate the missing clinical question or answers', () => {
    const question = newFollowUp(['a', 'b']);
    expect(question.title).toBe('');
    expect(rows(question.options).slice(0, 2).map(item => item.title)).toEqual(['', '']);
    expect(rows(question.options).at(-1)?.dimensionId).toBeNull();
    expect(validateMizajAuthoring({ schemaVersion: 3, sections: [], followUps: [question] }).length).toBeGreaterThan(0);
  });
});
