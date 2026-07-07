import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useThemeStore } from './stores/themeStore';
import { useSettingsStore } from './stores/settingsStore';
import { useChatStore } from './stores/chatStore';
import { THEMES } from './types';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { CleanupPanel } from './components/cleanup/CleanupPanel';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settingsOpen = useChatStore((s) => s.settingsOpen);
  const cleanupOpen = useChatStore((s) => s.cleanupOpen);

  // Apply theme on mount and whenever it changes. Colors come entirely from
  // the [data-theme="..."] CSS variables in globals.css; the `.dark` class is
  // kept for any Tailwind `dark:` utility refinements.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', THEMES.find((t) => t.id === theme)?.isDark ?? true);
  }, [theme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <ChatView />
      </main>
      {settingsOpen && <SettingsPanel />}
      {cleanupOpen && <CleanupPanel />}
      <Toaster
        position="top-center"
        theme={THEMES.find((t) => t.id === theme)?.isDark ? 'dark' : 'light'}
        richColors
        closeButton
      />
    </div>
  );
}
