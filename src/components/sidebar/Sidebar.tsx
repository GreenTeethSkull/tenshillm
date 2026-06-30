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
          className="fixed inset-0 bg-black/50 modal-backdrop z-[var(--z-overlay)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:relative z-[var(--z-sidebar)] lg:z-auto
          h-full w-[280px] flex flex-col
          bg-bg-secondary border-r border-border
          transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}
        `}
        aria-label="Conversation navigation"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-border"
          style={{ paddingTop: 'max(12px, var(--safe-top))', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center size-7 rounded-lg bg-accent/12 text-accent shrink-0">
              <MessageSquare size={16} aria-hidden="true" />
            </span>
            <h1 className="text-base font-semibold text-text tracking-tight truncate">
              TenshiLLM
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-2 rounded-lg hover:bg-surface-hover active:scale-90
              text-text-muted hover:text-text
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
              lg:hidden shrink-0"
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-accent text-white hover:bg-accent-hover active:scale-[0.98]
              text-sm font-medium transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
              shadow-sm"
          >
            <Plus size={18} aria-hidden="true" />
            New Chat
          </button>
          {activeProvider && activeModel && (
            <p className="text-xs text-text-muted mt-2 px-1 truncate">
              {activeProvider.name} / {activeModel.displayName}
            </p>
          )}
        </div>

        {/* Conversation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-1" aria-label="Conversations">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center text-center px-4 py-10">
              <div className="grid place-items-center size-12 rounded-2xl bg-accent/10 text-accent mb-3">
                <MessageSquare size={20} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-text-secondary mb-1">No conversations yet</p>
              <p className="text-xs text-text-muted leading-relaxed mb-4 max-w-[200px]">
                Start a new chat to begin chatting with your AI model.
              </p>
              <button
                onClick={handleNewChat}
                className="text-xs font-medium px-3 py-1.5 rounded-lg
                  text-accent hover:bg-accent-muted active:scale-95
                  transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
              >
                + New chat
              </button>
            </div>
          ) : (
            <ul className="conv-stagger space-y-0.5">
              {visibleConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <li key={conv.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversation(conv.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group w-full flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl
                        text-left transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
                        active:scale-[0.99] ${
                        isActive
                          ? 'bg-accent-muted text-accent'
                          : 'hover:bg-surface-hover text-text-secondary'
                      }`}
                    >
                      {isActive && <span className="conv-active-bar" aria-hidden="true" />}
                      <MessageSquare size={15} className="shrink-0 opacity-60" aria-hidden="true" />
                      <span className="flex-1 text-sm truncate leading-snug">{conv.title}</span>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveConversation(conv.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            archiveConversation(conv.id);
                          }
                        }}
                        aria-label={`Archive conversation ${conv.title}`}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                          grid place-items-center size-6 rounded-md
                          hover:bg-surface text-text-muted hover:text-text active:scale-90
                          transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] shrink-0"
                      >
                        <Archive size={13} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <button
            onClick={() => setCleanupOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
              hover:bg-surface-hover active:scale-[0.98] text-text-secondary text-sm
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          >
            <Trash2 size={15} className="opacity-60 shrink-0" aria-hidden="true" />
            Cleanup
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
              hover:bg-surface-hover active:scale-[0.98] text-text-secondary text-sm
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          >
            <Settings size={15} className="opacity-60 shrink-0" aria-hidden="true" />
            Settings
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed z-[var(--z-sidebar)] p-2.5 rounded-xl
            bg-surface/90 backdrop-blur-sm border border-border
            hover:bg-surface-hover active:scale-90 text-text-secondary
            transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
            lg:hidden"
          style={{
            top: 'max(12px, var(--safe-top))',
            left: 'max(12px, var(--safe-left))',
          }}
        >
          <PanelLeftOpen size={18} aria-hidden="true" />
        </button>
      )}
    </>
  );
}