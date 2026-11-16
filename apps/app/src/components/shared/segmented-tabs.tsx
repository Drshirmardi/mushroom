'use client';

import type { KeyboardEvent, ReactNode } from 'react';

export type SegmentedTabOption<T extends string> = {
  value: T;
  label: ReactNode;
  id: string;
  controls?: string;
};

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = options.findIndex((option) => option.value === value);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (currentIndex + (event.key === 'ArrowLeft' ? 1 : -1) + options.length) %
            options.length;
    const next = options[nextIndex];
    if (!next) return;

    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
    onChange(next.value);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      dir="rtl"
      onKeyDown={onKeyDown}
      className={`flex min-w-0 gap-1 rounded-xl bg-[var(--dp-surface-back)] p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            id={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={option.controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center text-sm font-medium text-[var(--dp-text-disabled)] transition-[background-color,color,box-shadow] duration-200 aria-selected:bg-[var(--dp-surface-elevated)] aria-selected:font-semibold aria-selected:text-[var(--dp-text-high)] aria-selected:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
