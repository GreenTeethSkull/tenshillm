import { useEffect } from 'react';
import { useThemeStore } from './stores/themeStore';
import { useSettingsStore } from './stores/settingsStore';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { CleanupPanel } from './components/cleanup/CleanupPanel';
import { useChatStore } from './stores/chatStore';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settingsOpen = useChatStore((s) => s.settingsOpen);
  const cleanupOpen = useChatStore((s) => s.cleanupOpen);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    loadSettings();
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <ChatView />
      </main>
      {settingsOpen && <SettingsPanel />}
      {cleanupOpen && <CleanupPanel />}
    </div>
  );
}