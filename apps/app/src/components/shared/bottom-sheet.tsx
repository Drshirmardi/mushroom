'use client';

import type { ReactNode } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export type BottomSheetProps = {
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: ReactNode;

  size?: 'auto' | 'medium' | 'large';
  dismissible?: boolean;
  showHandle?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  className?: string;
};

const keyboardSpace = 'calc(100dvh-var(--drawer-keyboard-inset,0px)-16px)';

const sizes = {
  auto: 'max-h-[min(76dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
  medium: 'h-[min(52dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
  large: 'h-[min(88dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
} as const;

export function BottomSheet({
  title,
  ariaLabel,
  onClose,
  children,
  size = 'auto',
  dismissible = true,
  showHandle = true,
  showCloseButton = true,
  footer,
  className,
}: BottomSheetProps) {
  const accessibleTitle = title ?? ariaLabel ?? 'پنجره گزینه‌ها';

  return (
    <Drawer.Root
      open
      modal
      swipeDirection="down"
      disablePointerDismissal={!dismissible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && dismissible) {
          onClose();
        }
      }}
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          {/* Backdrop */}
          <Drawer.Backdrop
            className={clsx(
              'fixed inset-0 z-[100]',
              'bg-slate-950/30',
              'opacity-[calc(1-var(--drawer-swipe-progress,0))]',
              'transition-opacity duration-300',
              'ease-[cubic-bezier(0.22,1,0.36,1)]',
              'data-[starting-style]:opacity-0',
              'data-[ending-style]:opacity-0',
              'data-[swiping]:duration-0',
              'motion-reduce:transition-none',
            )}
          />

          {/* Viewport */}
          <Drawer.Viewport
            className={clsx(
              'pointer-events-none',
              'fixed inset-0 z-[101]',
              'flex items-end justify-center',
            )}
          >
            {/* Sheet surface */}
            <Drawer.Popup
              dir="rtl"
              className={clsx(
                'pointer-events-auto relative',
                'flex min-h-0 w-full flex-col',
                'max-w-[720px]',
                sizes[size],

                // Surface
                'overflow-hidden',
                'rounded-t-[28px]',
                'border border-b-0 border-slate-200/70',
                'bg-white text-slate-900',
                'shadow-[0_-12px_50px_-20px_rgba(15,23,42,0.24)]',
                'outline-none',

                // Movement controlled by Base UI
                'transform-[translate3d(0,var(--drawer-swipe-movement-y,0px),0)]',

                // Smooth opening and release
                'transition-[transform] duration-[420ms]',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',

                // Enter / exit
                'data-[starting-style]:transform-[translate3d(0,100%,0)]',
                'data-[ending-style]:transform-[translate3d(0,100%,0)]',

                // Follow finger without transition lag
                'data-[swiping]:duration-0',
                'data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*420ms)]',

                // Accessibility
                'motion-reduce:transition-none',

                className,
              )}
            >
              {/* Drag handle */}
              {showHandle && (
                <div
                  aria-hidden="true"
                  className={clsx(
                    'flex shrink-0 justify-center',
                    'px-5 pt-3 pb-2',
                    'touch-none select-none',
                    'cursor-grab active:cursor-grabbing',
                  )}
                >
                  <span className={clsx('block h-1 w-9', 'rounded-full bg-slate-300')} />
                </div>
              )}

              <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                {/* Fixed header */}
                <header
                  className={clsx(
                    'relative flex shrink-0',
                    'min-h-14 items-center justify-center',
                    'px-14 py-2',
                  )}
                >
                  <Drawer.Title
                    className={clsx(
                      title
                        ? 'text-center text-[16px] leading-7 font-semibold tracking-tight text-slate-900'
                        : 'sr-only',
                    )}
                  >
                    {accessibleTitle}
                  </Drawer.Title>

                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="بستن پنجره"
                      className={clsx(
                        'absolute end-4 top-1/2',
                        '-translate-y-1/2',
                        'flex size-9 items-center justify-center',
                        'rounded-full',
                        'text-slate-400',
                        'transition-colors duration-200',
                        'hover:bg-slate-100',
                        'hover:text-slate-700',
                        'active:bg-slate-200',
                        'focus-visible:outline-2',
                        'focus-visible:outline-offset-2',
                        'focus-visible:outline-blue-600',
                      )}
                    >
                      <X size={19} strokeWidth={1.8} />
                    </button>
                  )}
                </header>

                {/* Independent scrollable body */}
                <div
                  data-base-ui-swipe-ignore=""
                  className={clsx(
                    'min-h-0 flex-1',
                    'overflow-x-hidden overflow-y-auto',
                    'overscroll-contain',
                    'px-5 pt-2',
                    footer ? 'pb-5' : 'pb-[max(24px,env(safe-area-inset-bottom))]',
                    '[scrollbar-width:none]',
                    '[&::-webkit-scrollbar]:hidden',
                  )}
                >
                  {children}
                </div>

                {/* Optional sticky footer */}
                {footer && (
                  <footer
                    className={clsx(
                      'shrink-0',
                      'border-t border-slate-100',
                      'bg-white',
                      'px-5 pt-4',
                      'pb-[max(16px,env(safe-area-inset-bottom))]',
                    )}
                  >
                    {footer}
                  </footer>
                )}
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}
