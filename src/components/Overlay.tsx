import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 tenshi-backdrop-in"
        style={{ backgroundColor: 'var(--code-bg)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'relative h-full w-full flex flex-col bg-background border-l border-border tenshi-drawer-in',
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 tenshi-backdrop-in"
        style={{ backgroundColor: 'var(--code-bg)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'relative w-full flex flex-col bg-background border border-border rounded-2xl shadow-2xl tenshi-modal-in',
          'sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] overflow-hidden',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
