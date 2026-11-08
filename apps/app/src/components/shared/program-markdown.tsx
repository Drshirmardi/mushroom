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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Existing content uses **Heading** on separate
    // lines instead of Markdown heading syntax.
    const standaloneBold = /^\*\*(.+?)\*\*$/u.exec(trimmed);

    if (standaloneBold) {
      result.push(`## ${standaloneBold[1]}`);
      continue;
    }

    // Some legacy tables have an empty header and
    // their actual headings in the first body row.
    const emptyHeader = tableCells(line);
    const separator = tableCells(lines[i + 1] ?? '');
    const nextRow = tableCells(lines[i + 2] ?? '');

    const isEmptyHeader =
      emptyHeader !== null && emptyHeader.length > 1 && emptyHeader.every((cell) => cell === '');

    const isSeparator = separator !== null && separator.every((cell) => /^:?-{3,}:?$/u.test(cell));

    const isBoldHeader = nextRow !== null && nextRow.every((cell) => /^\*\*.+\*\*$/u.test(cell));

    if (
      isEmptyHeader &&
      isSeparator &&
      isBoldHeader &&
      emptyHeader.length === nextRow.length &&
      separator.length === nextRow.length
    ) {
      const headings = nextRow.map((cell) => cell.slice(2, -2).trim());

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
    <div dir="rtl" className="min-w-0 text-foreground">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ node, ...props }) => (
            <h2
              {...props}
              className="mb-5 mt-10 text-xl font-extrabold leading-9 text-foreground"
            />
          ),

          h2: ({ node, ...props }) => (
            <h2
              {...props}
              className="mb-4 mt-10 border-r-[3px] border-primary pr-3 text-lg font-bold leading-9 text-foreground first:mt-0"
            />
          ),

          h3: ({ node, ...props }) => (
            <h3 {...props} className="mb-3 mt-7 text-base font-bold leading-8 text-foreground" />
          ),

          p: ({ node, ...props }) => (
            <p
              {...props}
              className="mb-5 whitespace-pre-line break-words text-[15px] leading-[2.25] text-foreground/90"
            />
          ),

          strong: ({ node, ...props }) => (
            <strong {...props} className="font-bold text-foreground" />
          ),

          ul: ({ node, ...props }) => (
            <ul
              {...props}
              className="mb-6 list-disc space-y-2 pr-6 text-[15px] leading-8 marker:text-primary"
            />
          ),

          ol: ({ node, ...props }) => (
            <ol
              {...props}
              className="mb-6 list-decimal space-y-2 pr-6 text-[15px] leading-8 marker:text-primary"
            />
          ),

          li: ({ node, ...props }) => <li {...props} className="break-words pr-1" />,

          table: ({ node, ...props }) => (
            <div
              role="region"
              aria-label="جدول اطلاعات برنامه"
              tabIndex={0}
              className="mb-7 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-white focus-visible:outline-2 focus-visible:outline-primary"
            >
              <table
                {...props}
                className="w-full min-w-[680px] border-collapse text-right text-sm"
              />
            </div>
          ),

          thead: ({ node, ...props }) => (
            <thead {...props} className="bg-slate-100 text-foreground" />
          ),

          th: ({ node, ...props }) => (
            <th
              {...props}
              className="border-b border-l border-border/60 px-4 py-3 text-right font-bold leading-7 last:border-l-0"
            />
          ),

          td: ({ node, ...props }) => (
            <td
              {...props}
              className="border-b border-l border-border/60 px-4 py-3 text-right align-top leading-7 last:border-l-0"
            />
          ),

          tr: ({ node, ...props }) => <tr {...props} className="even:bg-slate-50/70" />,

          a: ({ node, ...props }) => (
            <a {...props} className="font-medium text-primary underline underline-offset-4" />
          ),

          blockquote: ({ node, ...props }) => (
            <blockquote
              {...props}
              className="my-6 border-r-4 border-primary/40 bg-slate-50 px-5 py-4 text-sm leading-8 text-muted-foreground"
            />
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
