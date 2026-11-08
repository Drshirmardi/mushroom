'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

export type BottomSheetHandle = {
  /** Close after an explicitly confirmed action. */
  close: () => void;
};

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
   * Return false to prevent dismissal.
   * Useful for dirty forms and pending payments.
   */
  onBeforeClose?: () => boolean;

  /**
   * Require another upward pull after reaching
   * the bottom of a scrollable list.
   */
  overscrollToDismiss?: boolean;

  /** Deprecated. Exit animation is now always enabled. */
  animateExit?: boolean;
};

const sizes = {
  auto: 'max-h-[min(76dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
  medium: 'h-[min(52dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
  large: 'h-[min(88dvh,calc(100dvh-var(--drawer-keyboard-inset,0px)-16px))]',
} as const;

type TouchStart = {
  y: number;
  atEnd: boolean;
};

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(function BottomSheet(
  {
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
    onBeforeClose,
    overscrollToDismiss = true,
  },
  ref,
) {
  // Begin closed so the entrance transition
  // starts from below the viewport.
  const [open, setOpen] = useState(false);

  const openedRef = useRef(false);
  const completedRef = useRef(false);
  const touchStartRef = useRef<TouchStart | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      openedRef.current = true;
      setOpen(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const forceClose = useCallback(() => {
    setOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({ close: forceClose }), [forceClose]);

  const requestClose = useCallback(() => {
    if (!dismissible || !open) return;

    if (onBeforeClose?.() === false) {
      return;
    }

    setOpen(false);
  }, [dismissible, onBeforeClose, open]);

  const onScrollTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = null;

    if (!overscrollToDismiss || !dismissible || event.touches.length !== 1) {
      return;
    }

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      return;
    }

    const element = event.currentTarget;
    const maxScroll = element.scrollHeight - element.clientHeight;

    touchStartRef.current = {
      y: event.touches[0].clientY,
      atEnd: maxScroll > 8 && element.scrollTop >= maxScroll - 3,
    };
  };

  const onScrollTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start?.atEnd || !open) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const upwardPull = start.y - touch.clientY;
    const element = event.currentTarget;

    const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;

    // A deliberate second pull, not simply arriving
    // at the last item.
    if (upwardPull >= 110 && remaining <= 3) {
      requestClose();
    }
  };

  const accessibleTitle = title ?? ariaLabel ?? 'پنجره گزینه‌ها';

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

        if (!dismissible || onBeforeClose?.() === false) {
          details.cancel();
          return;
        }

        setOpen(false);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen && openedRef.current && !completedRef.current) {
          completedRef.current = true;
          onClose();
        }
      }}
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop
            className={cn(
              'fixed inset-0 z-[100]',
              'bg-slate-950/30',
              'opacity-[calc(1-var(--drawer-swipe-progress,0))]',
              'transition-opacity duration-[380ms]',
              'ease-[cubic-bezier(0.22,1,0.36,1)]',
              'data-[starting-style]:opacity-0',
              'data-[ending-style]:opacity-0',
              'data-[swiping]:duration-0',
              'motion-reduce:transition-none',
            )}
          />

          <Drawer.Viewport
            className={cn(
              'pointer-events-none',
              'fixed inset-0 z-[101]',
              'flex items-end justify-center',
            )}
          >
            <Drawer.Popup
              dir="rtl"
              className={cn(
                // App-specific theme variables
                'patient-app-shell',

                // Layout
                'pointer-events-auto relative',
                'mx-auto flex min-h-0 w-full flex-col',
                'max-w-[720px]',
                sizes[size],

                // Surface
                'overflow-hidden',
                'rounded-t-[28px]',
                'border border-b-0',
                'border-slate-200/60',
                'bg-white text-foreground',
                'shadow-[0_-12px_48px_-20px_rgba(15,23,42,0.18)]',
                'outline-none',

                // Base UI swipe position
                'transform-[translateY(var(--drawer-swipe-movement-y,0px))]',

                // Smooth entrance and exit
                'transition-[transform]',
                'duration-[480ms]',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',

                // Enter from below
                'data-[starting-style]:transform-[translateY(100%)]',

                // Exit below
                'data-[ending-style]:transform-[translateY(100%)]',

                // Follow finger immediately
                'data-[swiping]:transition-none',

                // Accessibility
                'motion-reduce:transition-none',

                className,
              )}
            >
              {showHandle && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'flex shrink-0 justify-center',
                    'cursor-grab select-none',
                    'touch-none active:cursor-grabbing',
                    'px-5 pt-3 pb-2',
                  )}
                >
                  <span className="block h-1 w-9 rounded-full bg-slate-300" />
                </div>
              )}

              <Drawer.Content className="flex min-h-0 flex-1 flex-col">
                <header
                  className={cn(
                    'relative flex min-h-14',
                    'shrink-0 items-center justify-center',
                    'px-14 py-2',
                  )}
                >
                  <Drawer.Title
                    className={cn(
                      'text-center text-base',
                      'font-semibold leading-7',
                      'tracking-tight text-foreground',
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
                        'rounded-full text-slate-400',
                        'transition-colors duration-200',
                        'hover:bg-slate-100',
                        'hover:text-slate-700',
                        'active:bg-slate-200',
                        'focus-visible:outline-2',
                        'focus-visible:outline-offset-2',
                        'focus-visible:outline-primary',
                      )}
                    >
                      <X size={19} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  )}
                </header>

                {/* Scrollable body: swipe is NOT ignored */}
                <div
                  onTouchStart={onScrollTouchStart}
                  onTouchEnd={onScrollTouchEnd}
                  onTouchCancel={() => {
                    touchStartRef.current = null;
                  }}
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

                {footer && (
                  <footer
                    className={cn(
                      'shrink-0 border-t border-border/60',
                      'bg-background px-5 pt-4',
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
});
