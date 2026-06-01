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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-40 lg:z-auto
          h-full w-72 flex flex-col
          bg-bg-secondary border-r border-border
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h1 className="text-sm font-semibold text-text flex items-center gap-2">
            <MessageSquare size={18} className="text-accent" />
            TenshiLLM
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors lg:hidden"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
              bg-accent text-white hover:bg-accent-hover
              text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
          {activeProvider && activeModel && (
            <p className="text-xs text-text-muted mt-2 truncate">
              {activeProvider.name} / {activeModel.displayName}
            </p>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2">
          {visibleConversations.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {visibleConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-accent-muted text-accent'
                      : 'hover:bg-surface-hover text-text-secondary'
                  }`}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="flex-1 text-sm truncate">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface text-text-muted hover:text-text transition-all"
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
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => setCleanupOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
              hover:bg-surface-hover text-text-secondary text-sm transition-colors"
          >
            <Trash2 size={16} />
            Cleanup
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
              hover:bg-surface-hover text-text-secondary text-sm transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg
            bg-surface border border-border
            hover:bg-surface-hover text-text-secondary
            transition-colors lg:hidden"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </>
  );
}
