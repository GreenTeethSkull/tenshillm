// TenshiLLM - Mobile-first AI chat client
// Copyright (C) 2026 Angel Rios
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
