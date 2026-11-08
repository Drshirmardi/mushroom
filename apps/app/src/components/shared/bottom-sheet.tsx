'use client';

import { useState, type ReactNode } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

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

  /**
   * Wait for the exit transition before calling onClose.
   *
   * Keep false for legacy callers that use onClose
   * as a dismissal request or confirmation guard.
   */
  animateExit?: boolean;
};

const sizes = {
  auto: cn('h-auto', 'max-h-[min(76dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]'),
  medium: cn('h-[min(52dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]'),
  large: cn('h-[min(88dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]'),
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
  animateExit = false,
}: BottomSheetProps) {
  const [open, setOpen] = useState(true);

  const accessibleTitle = title ?? ariaLabel ?? 'پنجره گزینه‌ها';

  const requestClose = () => {
    if (!dismissible || !open) return;

    if (animateExit) {
      setOpen(false);
    } else {
      onClose();
    }
  };

  return (
    <Drawer.Root
      open={open}
      modal
      swipeDirection="down"
      disablePointerDismissal={!dismissible}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }

        if (!dismissible) {
          details.cancel();
          return;
        }

        if (animateExit) {
          setOpen(false);
        } else {
          // Preserve existing close-guard behavior.
          details.cancel();
          onClose();
        }
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen && animateExit) {
          onClose();
        }
      }}
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal className="patient-app-shell">
          {/* Backdrop */}
          <Drawer.Backdrop
            className={cn(
              'fixed inset-0 z-[100]',
              'bg-slate-950/30',

              'opacity-[calc(1-var(--drawer-swipe-progress,0))]',
              'transition-opacity duration-[400ms]',
              'ease-[cubic-bezier(0.22,1,0.36,1)]',

              'data-[starting-style]:opacity-0',
              'data-[ending-style]:opacity-0',
              'data-[swiping]:duration-0',
              'motion-reduce:transition-none',
            )}
          />

          {/* Drawer viewport */}
          <Drawer.Viewport
            className={cn(
              'pointer-events-none',
              'fixed inset-0 z-[101]',
              'flex items-end justify-center',
            )}
          >
            {/* Animated surface */}
            <Drawer.Popup
              dir="rtl"
              className={cn(
                'pointer-events-auto relative',
                'mx-auto flex min-h-0 w-full flex-col',
                'max-w-[720px]',
                sizes[size],

                // Surface
                'overflow-hidden',
                'rounded-t-[28px]',
                'border border-b-0 border-slate-200/70',
                'bg-white text-slate-900',
                'shadow-[0_-12px_50px_-20px_rgba(15,23,42,0.18)]',
                'outline-none',

                // Swipe position
                'transform-[translate3d(0,var(--drawer-swipe-movement-y,0px),0)]',

                // Smooth opening and closing
                'transition-transform',
                'duration-[520ms]',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',

                // Start below screen
                'data-[starting-style]:transform-[translate3d(0,100%,0)]',

                // Exit below screen
                'data-[ending-style]:transform-[translate3d(0,100%,0)]',

                // Let the surface follow the finger
                'data-[swiping]:duration-0',

                // Respect accessibility preferences
                'motion-reduce:transition-none',

                className,
              )}
            >
              {/* Handle */}
              {showHandle && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'flex shrink-0 justify-center',
                    'px-5 pt-3 pb-2',
                    'select-none touch-none',
                    'cursor-grab active:cursor-grabbing',
                  )}
                >
                  <span className={cn('block h-1 w-9 rounded-full', 'bg-slate-300')} />
                </div>
              )}

              <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                {/* Fixed header */}
                <header
                  className={cn(
                    'relative flex shrink-0',
                    'min-h-14 items-center justify-center',
                    'px-14 py-2',
                  )}
                >
                  <Drawer.Title
                    className={cn(
                      'text-center text-[16px]',
                      'leading-7 font-semibold',
                      'tracking-tight text-slate-900',
                      !title && 'sr-only',
                    )}
                  >
                    {accessibleTitle}
                  </Drawer.Title>

                  <Drawer.Description className="sr-only">
                    {ariaLabel ?? accessibleTitle}
                  </Drawer.Description>

                  {showCloseButton && dismissible && (
                    <button
                      type="button"
                      onClick={requestClose}
                      aria-label="بستن پنجره"
                      className={cn(
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
                      <X size={19} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  )}
                </header>

                {/* Scrollable content */}
                <div
                  data-base-ui-swipe-ignore=""
                  className={cn(
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
                    className={cn(
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
