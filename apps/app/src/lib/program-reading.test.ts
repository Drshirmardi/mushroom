import { describe, expect, it } from 'vitest';
import { parseProgramBody } from './program-reading';

describe('parseProgramBody', () => {
  it('separates Persian paragraphs', () => {
    const result = parseProgramBody('پاراگراف اول درباره برنامه.\n\nپاراگراف دوم درباره برنامه.');

    expect(result).toEqual([
      {
        type: 'paragraph',
        text: 'پاراگراف اول درباره برنامه.',
      },
      {
        type: 'paragraph',
        text: 'پاراگراف دوم درباره برنامه.',
      },
    ]);
  });

  it('recognizes headings without losing the title', () => {
    const result = parseProgramBody('# مقدمه\nمتن مقدمه.\n\n### نکات مهم\nمتن نکات.');

    expect(result[0]).toEqual({
      type: 'heading',
      level: 2,
      text: 'مقدمه',
    });

    expect(result[2]).toEqual({
      type: 'heading',
      level: 3,
      text: 'نکات مهم',
    });
  });

  it('renders numbered items in their original order', () => {
    const result = parseProgramBody('۳. مورد سوم\n۴) مورد چهارم');

    expect(result).toEqual([
      {
        type: 'list',
        ordered: true,
        items: [
          { marker: '۳.', text: 'مورد سوم' },
          { marker: '۴)', text: 'مورد چهارم' },
        ],
      },
    ]);
  });

  it('recognizes bullet lists', () => {
    const result = parseProgramBody('- نکته اول\n- نکته دوم');

    expect(result).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          { marker: '•', text: 'نکته اول' },
          { marker: '•', text: 'نکته دوم' },
        ],
      },
    ]);
  });

  it('keeps text that resembles HTML as plain text', () => {
    const result = parseProgramBody('راهنمای آموزشی\r\n\r\n<script>alert(1)</script>');

    expect(result[1]).toEqual({
      type: 'paragraph',
      text: '<script>alert(1)</script>',
    });
  });

  it('returns no blocks for empty content', () => {
    expect(parseProgramBody('  \n\n  ')).toEqual([]);
  });
});
