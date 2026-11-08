export type ReadingBlock =
  | {
      type: 'heading';
      level: 2 | 3;
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'list';
      ordered: boolean;
      items: Array<{
        marker: string;
        text: string;
      }>;
    };

const markdownHeading = /^(#{1,3})\s+(.+)$/u;
const bulletItem = /^([-*•●▪])\s+(.+)$/u;
const numberedItem = /^([0-9۰-۹٠-٩]+[.)])\s+(.+)$/u;

/**
 * Format the existing plain-text curriculum for reading.
 *
 * Supported conventions:
 * - Blank lines between paragraphs
 * - # / ## / ### headings
 * - Short standalone headings ending in :
 * - - / * / • bullet lists
 * - 1. / ۱. / 1) numbered lists
 *
 * No HTML is parsed or executed.
 */
export function parseProgramBody(body: string): ReadingBlock[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReadingBlock[] = [];

  let paragraphLines: string[] = [];

  let currentList: Extract<ReadingBlock, { type: 'list' }> | null = null;

  const flushParagraph = () => {
    const text = paragraphLines.join('\n').trim();
    if (text) {
      blocks.push({
        type: 'paragraph',
        text,
      });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push(currentList);
    }
    currentList = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = markdownHeading.exec(line);

    const previousLineIsBlank = index === 0 || !lines[index - 1].trim();

    const standaloneHeading = previousLineIsBlank && line.length <= 65 && /[:：]$/u.test(line);

    if (heading || standaloneHeading) {
      flushParagraph();
      flushList();

      const text = heading ? heading[2].trim() : line;

      blocks.push({
        type: 'heading',
        level: heading && heading[1].length === 3 ? 3 : 2,
        text,
      });
      continue;
    }

    const bullet = bulletItem.exec(line);
    const numbered = numberedItem.exec(line);

    if (bullet || numbered) {
      flushParagraph();

      const ordered = Boolean(numbered);

      if (currentList && currentList.ordered !== ordered) {
        flushList();
      }

      if (!currentList) {
        currentList = {
          type: 'list',
          ordered,
          items: [],
        };
      }

      currentList.items.push({
        marker: numbered ? numbered[1] : '•',
        text: numbered ? numbered[2] : bullet![2],
      });

      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}
