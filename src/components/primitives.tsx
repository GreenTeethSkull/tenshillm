import type { ReactNode, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/* =========================================================================
   Toggle — accessible switch (role="switch")
   ========================================================================= */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-primary' : 'bg-muted-foreground/40'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

/* =========================================================================
   TextInput — themed text/password/number input
   ========================================================================= */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  id?: string;
  name?: string;
  autoComplete?: string;
  className?: string;
  mono?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  id,
  name,
  autoComplete,
  className,
  mono,
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      autoComplete={autoComplete}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-[background-color,border-color,box-shadow,opacity,transform]',
        mono && 'font-mono',
        className
      )}
    />
  );
}

/* =========================================================================
   TextAreaInput — themed textarea
   ========================================================================= */
interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
  mono?: boolean;
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  id,
  className,
  mono,
}: TextAreaInputProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-[background-color,border-color,box-shadow,opacity,transform] resize-y leading-relaxed',
        mono && 'font-mono',
        className
      )}
    />
  );
}

/* =========================================================================
   SelectInput — themed native select (mobile-friendly, reliable)
   ========================================================================= */
interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  id?: string;
}

export function SelectInput({ value, onChange, children, id }: SelectInputProps) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-10 rounded-lg border border-input bg-card px-3 pr-9 text-sm text-foreground appearance-none cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-[background-color,border-color,box-shadow,opacity,transform]'
        )}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/* =========================================================================
   RangeInput — themed range slider
   ========================================================================= */
interface RangeInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  id?: string;
}

export function RangeInput({ value, onChange, min, max, step = 1, id }: RangeInputProps) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted-bg accent-primary"
      style={{ accentColor: 'var(--primary)' }}
    />
  );
}

/* =========================================================================
   CheckBox — themed checkbox with label
   ========================================================================= */
interface CheckBoxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function CheckBox({ checked, onChange, label, id }: CheckBoxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm cursor-pointer select-none"
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-primary cursor-pointer"
        style={{ accentColor: 'var(--primary)' }}
      />
      <span>{label}</span>
    </label>
  );
}

/* =========================================================================
   Field — label + control wrapper
   ========================================================================= */
interface FieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* =========================================================================
   PrimaryButton / GhostButton / DangerGhost — themed buttons
   ========================================================================= */
interface ButtonProps {
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  type = 'button',
  ariaLabel,
  title,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium',
        'hover:opacity-90 active:scale-[0.98] transition-[background-color,border-color,color,opacity,box-shadow,transform] disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  onClick,
  children,
  disabled,
  type = 'button',
  ariaLabel,
  title,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-sm text-foreground',
        'hover:bg-muted-bg active:scale-[0.98] transition-[background-color,border-color,color,opacity,box-shadow,transform] disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconGhostButton({
  onClick,
  children,
  disabled,
  ariaLabel,
  title,
  className,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'grid place-items-center size-8 rounded-lg text-muted-foreground',
        'hover:bg-muted-bg hover:text-foreground transition-colors disabled:opacity-40',
        className
      )}
    >
      {children}
    </button>
  );
}
