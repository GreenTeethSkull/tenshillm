import { create } from 'zustand';
import type { ThemeName } from '../types';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('tenshillm-theme') as ThemeName) || 'tokyo-night',
  setTheme: (theme) => {
    localStorage.setItem('tenshillm-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));
