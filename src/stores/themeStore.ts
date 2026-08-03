import { create } from 'zustand';
import { THEMES, type ThemeName } from '../types';

// Whether a theme is dark — used to toggle the `.dark` class so shadcn's
// `dark:` utility refinements apply. Actual colors always come from the
// `[data-theme="..."]` CSS variables.
function isDarkTheme(theme: ThemeName): boolean {
  return THEMES.find((t) => t.id === theme)?.isDark ?? true;
}

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', isDarkTheme(theme));
}

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('tenshillm-theme') as ThemeName) || 'dracula',
  setTheme: (theme) => {
    localStorage.setItem('tenshillm-theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  resetTheme: () => {
    localStorage.removeItem('tenshillm-theme');
    applyTheme('dracula');
    set({ theme: 'dracula' });
  },
}));
