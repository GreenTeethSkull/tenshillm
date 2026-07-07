// Lightweight className joiner (replaces shadcn's clsx + tailwind-merge combo).
// HeroUI v3 components accept plain className strings, so we only need to
// filter falsy values and join with spaces.
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
