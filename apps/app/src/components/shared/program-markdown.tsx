'use client';

import { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  body: string;
};

function tableCells(line: string): string[] | null {
  const value = line.trim();

  if (!value.startsWith('|') || !value.endsWith('|')) {
    return null;
  }

  return value
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function normalizeMarkdown(body: string): string {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const result: string[] = [];

  let codeFence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Do not modify text inside fenced code.
    const fenceMatch = /^(`{3,}|~{3,})/u.exec(trimmed);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];

      if (codeFence === null) {
        codeFence = marker;
      } else if (codeFence === marker) {
        codeFence = null;
      }

      result.push(line);
      continue;
    }

    if (codeFence !== null) {
      result.push(line);
      continue;
    }

    // Legacy standalone bold titles.
    const heading = /^\*\*(.+?)\*\*$/u.exec(trimmed);

    if (heading) {
      result.push('', `## ${heading[1].trim()}`, '');
      continue;
    }

    // Repair a known legacy Markdown-table format:
    // empty headings followed by bold column names.
    const header = tableCells(line);
    const separator = tableCells(lines[i + 1] ?? '');
    const next = tableCells(lines[i + 2] ?? '');

    const emptyHeader = header !== null && header.length > 1 && header.every((cell) => cell === '');

    const validSeparator =
      separator !== null && separator.every((cell) => /^:?-{3,}:?$/u.test(cell));

    const boldHeadings = next !== null && next.every((cell) => /^\*\*.+\*\*$/u.test(cell));

    if (
      emptyHeader &&
      validSeparator &&
      boldHeadings &&
      header.length === separator.length &&
      header.length === next.length
    ) {
      const headings = next.map((cell) => cell.slice(2, -2).trim());

      result.push(`| ${headings.join(' | ')} |`);
      result.push(lines[i + 1]);

      i += 2;
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

export function ProgramMarkdown({ body }: Props) {
  const markdown = useMemo(() => normalizeMarkdown(body), [body]);

  return (
    <div
      dir="rtl"
      className="
        w-full min-w-0 max-w-full
        text-foreground
        [overflow-wrap:anywhere]
        [&>*:first-child]:mt-0
      "
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ node, ...props }) => (
            <h2 {...props} className="mb-5 mt-10 break-words text-xl font-extrabold leading-10" />
          ),

          h2: ({ node, ...props }) => (
            <h2
              {...props}
              className="mb-4 mt-10 break-words border-r-[3px] border-primary pr-3 text-lg font-bold leading-9"
            />
          ),

          h3: ({ node, ...props }) => (
            <h3 {...props} className="mb-3 mt-7 break-words text-base font-bold leading-8" />
          ),

          p: ({ node, ...props }) => (
            <p
              {...props}
              className="
                mb-5 max-w-full
                whitespace-pre-line break-words
                leading-[2.15] text-foreground/90
                [overflow-wrap:anywhere]
              "
            />
          ),

          strong: ({ node, ...props }) => (
            <strong {...props} className="font-bold text-foreground" />
          ),

          ul: ({ node, ...props }) => (
            <ul
              {...props}
              className="mb-6 max-w-full list-disc space-y-2 pr-6 leading-8 marker:text-primary"
            />
          ),

          ol: ({ node, ...props }) => (
            <ol
              {...props}
              className="mb-6 max-w-full list-decimal space-y-2 pr-6 leading-8 marker:text-primary"
            />
          ),

          li: ({ node, ...props }) => (
            <li {...props} className="min-w-0 break-words [overflow-wrap:anywhere]" />
          ),

          // Each table has its own horizontal scroll.
          table: ({ node, ...props }) => (
            <div
              role="region"
              aria-label="جدول اطلاعات برنامه"
              tabIndex={0}
              className="
                my-6 block w-full min-w-0 max-w-full
                overflow-x-auto overscroll-x-contain
                rounded-2xl border border-border bg-white
                [-webkit-overflow-scrolling:touch]
                focus-visible:outline-2
                focus-visible:outline-primary
              "
            >
              <table
                {...props}
                className="
                  w-full min-w-[680px] table-fixed
                  border-collapse text-right text-sm
                "
              />
            </div>
          ),

          thead: ({ node, ...props }) => (
            <thead {...props} className="bg-slate-100 text-foreground" />
          ),

          th: ({ node, ...props }) => (
            <th
              {...props}
              className="
                border-b border-l border-border/60
                px-3 py-3 text-right align-top
                font-bold leading-7 last:border-l-0
                [overflow-wrap:anywhere]
              "
            />
          ),

          td: ({ node, ...props }) => (
            <td
              {...props}
              className="
                border-b border-l border-border/60
                px-3 py-3 text-right align-top
                leading-7 last:border-l-0
                [overflow-wrap:anywhere]
              "
            />
          ),

          tr: ({ node, ...props }) => <tr {...props} className="even:bg-slate-50/70" />,

          a: ({ node, ...props }) => (
            <a
              {...props}
              className="
                break-words font-medium text-primary
                underline underline-offset-4
                [overflow-wrap:anywhere]
              "
            />
          ),

          img: ({ node, ...props }) => (
            <img
              {...props}
              loading="lazy"
              className="
                my-5 block h-auto max-w-full
                rounded-xl object-contain
              "
            />
          ),

          pre: ({ node, ...props }) => (
            <pre
              {...props}
              className="
                my-5 w-full min-w-0 max-w-full
                overflow-x-auto rounded-xl bg-slate-100
                p-4 text-sm leading-7
              "
            />
          ),

          code: ({ node, ...props }) => <code {...props} className="font-mono text-sm" />,

          blockquote: ({ node, ...props }) => (
            <blockquote
              {...props}
              className="
                my-6 max-w-full break-words
                border-r-4 border-primary/40
                bg-slate-50 px-5 py-4 leading-8
                text-muted-foreground
              "
            />
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
