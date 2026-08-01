import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useOverlayFocus(dialogRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    const focusable = getFocusable();

    (focusable[0] || dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const currentFocusable = getFocusable();
      if (event.key !== 'Tab' || !dialog || currentFocusable.length === 0) return;

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [dialogRef]);
}

interface DrawerProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
  width?: string;
}

/**
 * Right slide-over panel (Claude/ChatGPT-style settings drawer).
 * Mounted = open; closing unmounts. Handles Escape + backdrop click.
 */
export function Drawer({ onClose, children, className, label, width = 'max-w-2xl' }: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 tenshi-backdrop-in"
        style={{ backgroundColor: 'rgb(8 10 18 / 48%)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative h-full w-full flex flex-col bg-background border-l border-border shadow-2xl overscroll-contain overflow-hidden tenshi-drawer-in',
          'lg:rounded-l-2xl',
          width,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}

/**
 * Centered modal with backdrop. Mounted = open.
 */
export function Modal({ onClose, children, className, label }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 tenshi-backdrop-in"
        style={{ backgroundColor: 'rgb(8 10 18 / 48%)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative w-full flex flex-col bg-background border border-border rounded-2xl shadow-2xl tenshi-modal-in',
          'sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] overflow-hidden overscroll-contain',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
