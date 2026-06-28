import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  Plus,
  MessageSquare,
  Settings,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Archive,
} from 'lucide-react';

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    setActiveConversation,
    setSidebarOpen,
    setSettingsOpen,
    setCleanupOpen,
    createNewConversation,
    archiveConversation,
  } = useChatStore();

  const { providers, activeProviderId, activeModelId } = useSettingsStore();

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const activeModel = activeProvider?.models.find((m) => m.id === activeModelId);

  const handleNewChat = () => {
    if (!activeProviderId || !activeModelId) {
      setSettingsOpen(true);
      return;
    }
    createNewConversation(activeProviderId, activeModelId);
  };

  const visibleConversations = conversations.filter((c) => !c.isArchived);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-40 lg:z-auto
          h-full w-[280px] flex flex-col
          bg-bg-secondary border-r border-border
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-border"
          style={{ paddingTop: 'max(12px, var(--safe-top))' }}
        >
          <div className="flex items-center gap-2.5 py-3.5">
            <MessageSquare size={20} className="text-accent" />
            <h1 className="text-base font-semibold text-text tracking-tight">
              TenshiLLM
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2.5 -mr-1 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text transition-colors lg:hidden"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-accent text-white hover:bg-accent-hover active:scale-[0.98]
              text-sm font-medium transition-all"
          >
            <Plus size={18} />
            New Chat
          </button>
          {activeProvider && activeModel && (
            <p className="text-xs text-text-muted mt-2.5 px-1 truncate">
              {activeProvider.name} / {activeModel.displayName}
            </p>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {visibleConversations.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12 px-4">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    activeConversationId === conv.id
                      ? 'bg-accent-muted text-accent'
                      : 'hover:bg-surface-hover text-text-secondary'
                  }`}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  <MessageSquare size={16} className="shrink-0 opacity-60" />
                  <span className="flex-1 text-sm truncate leading-snug">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-all shrink-0"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <button
            onClick={() => setCleanupOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
              hover:bg-surface-hover text-text-secondary text-sm transition-colors"
          >
            <Trash2 size={16} className="opacity-60" />
            Cleanup
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
              hover:bg-surface-hover text-text-secondary text-sm transition-colors"
          >
            <Settings size={16} className="opacity-60" />
            Settings
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed z-50 p-2.5 rounded-xl
            bg-surface/90 backdrop-blur-sm border border-border
            hover:bg-surface-hover text-text-secondary
            transition-colors lg:hidden"
          style={{
            top: 'max(12px, var(--safe-top))',
            left: 'max(12px, var(--safe-left))',
          }}
        >
          <PanelLeftOpen size={20} />
        </button>
      )}
    </>
  );
}
