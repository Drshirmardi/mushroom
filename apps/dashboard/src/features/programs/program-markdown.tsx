'use client';

import { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function tableCells(line: string): string[] | null {
  const value = line.trim();
  if (!value.startsWith('|') || !value.endsWith('|')) return null;
  return value.slice(1, -1).split('|').map((cell) => cell.trim());
}

function normalizeMarkdown(body: string): string {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const result: string[] = [];
  let codeFence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fence = /^(`{3,}|~{3,})/u.exec(trimmed);
    if (fence) {
      codeFence = codeFence === null ? fence[1][0] : codeFence === fence[1][0] ? null : codeFence;
      result.push(line);
      continue;
    }
    if (codeFence !== null) {
      result.push(line);
      continue;
    }

    const boldHeading = /^\*\*(.+?)\*\*$/u.exec(trimmed);
    if (boldHeading) {
      result.push('', `## ${boldHeading[1].trim()}`, '');
      continue;
    }

    const header = tableCells(line);
    const separator = tableCells(lines[i + 1] ?? '');
    const next = tableCells(lines[i + 2] ?? '');
    const emptyHeader = header !== null && header.length > 1 && header.every((cell) => cell === '');
    const validSeparator = separator !== null && separator.every((cell) => /^:?-{3,}:?$/u.test(cell));
    const boldHeadings = next !== null && next.every((cell) => /^\*\*.+\*\*$/u.test(cell));
    if (emptyHeader && validSeparator && boldHeadings && header.length === separator.length && header.length === next.length) {
      result.push(`| ${next.map((cell) => cell.slice(2, -2).trim()).join(' | ')} |`, lines[i + 1]);
      i += 2;
      continue;
    }
    result.push(line);
  }
  return result.join('\n');
}

export function ProgramMarkdown({ body }: { body: string }) {
  const markdown = useMemo(() => normalizeMarkdown(body), [body]);
  return (
    <div dir="rtl" className="program-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ node, ...headingProps }) => {
            void node;
            return <h2 {...headingProps} />;
          },
          table: ({ node, ...tableProps }) => {
            void node;
            return (
              <div role="region" aria-label="جدول اطلاعات خدمت" tabIndex={0} className="program-markdown-table">
                <table {...tableProps} />
              </div>
            );
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
