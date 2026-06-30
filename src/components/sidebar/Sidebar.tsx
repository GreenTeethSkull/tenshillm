import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  Plus,
  MessageSquare,
  Settings,
  Trash2,
  PanelLeftClose,
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
      setSidebarOpen(false);
      return;
    }
    createNewConversation(activeProviderId, activeModelId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const visibleConversations = conversations.filter((c) => !c.isArchived);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 modal-backdrop lg:hidden"
          style={{ zIndex: 'var(--z-overlay)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:relative
          h-full w-[300px] flex flex-col
          bg-bg-secondary border-r border-border
          transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]
          ${sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'
          }
        `}
        style={{ zIndex: 'var(--z-sidebar)' }}
        aria-label="Conversation navigation"
      >
        {/* Brand header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-border"
          style={{ paddingTop: 'max(16px, var(--safe-top))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center size-8 rounded-lg bg-accent/12 text-accent shrink-0">
              <MessageSquare size={18} aria-hidden="true" />
            </span>
            <h1 className="text-base font-semibold text-text tracking-tight truncate">
              TenshiLLM
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-2 -mr-1 rounded-lg hover:bg-surface-hover active:scale-90
              text-text-muted hover:text-text
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
              lg:hidden shrink-0"
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        </div>

        {/* New Chat CTA */}
        <div className="px-4 py-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-accent text-white hover:bg-accent-hover active:scale-[0.98]
              text-sm font-medium transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
              shadow-sm"
          >
            <Plus size={18} aria-hidden="true" />
            New Chat
          </button>
          {activeProvider && activeModel && (
            <div className="flex items-center gap-2 mt-3 px-2">
              <span className="size-1.5 rounded-full bg-success/80 shrink-0" aria-hidden="true" />
              <p className="text-xs text-text-muted truncate">{activeProvider.name} / {activeModel.displayName}</p>
            </div>
          )}
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Conversations">
          {visibleConversations.length === 0 ? (
            <div className="flex flex-col items-center text-center px-4 py-12">
              <div className="grid place-items-center size-12 rounded-2xl bg-surface text-text-muted mb-3">
                <MessageSquare size={20} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-text mb-1">No conversations yet</p>
              <p className="text-xs text-text-muted leading-relaxed mb-4 text-pretty max-w-[220px]">
                Start a new chat to talk with your model. Your history will appear here.
              </p>
              <button
                onClick={handleNewChat}
                className="text-xs font-medium px-3 py-2 rounded-lg
                  bg-surface hover:bg-surface-hover text-accent
                  active:scale-95 transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
              >
                + New chat
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversation(conv.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      aria-current={isActive ? 'true' : undefined}
                      className={`group relative w-full flex items-center gap-3 pl-4 pr-2 py-3 rounded-xl
                        text-left transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
                        active:scale-[0.99] ${
                        isActive
                          ? 'bg-surface text-text'
                          : 'hover:bg-surface-hover text-text-secondary'
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-accent"
                          aria-hidden="true"
                        />
                      )}
                      <MessageSquare
                        size={16}
                        className={`shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`}
                        aria-hidden="true"
                      />
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
                          grid place-items-center size-7 rounded-md
                          hover:bg-bg text-text-muted hover:text-text active:scale-90
                          transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] shrink-0"
                      >
                        <Archive size={14} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Footer nav */}
        <div
          className="px-3 py-3 border-t border-border space-y-1"
          style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
        >
          <button
            onClick={() => { setCleanupOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-surface-hover active:scale-[0.98] text-text-secondary text-sm
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          >
            <Trash2 size={16} className="text-text-muted shrink-0" aria-hidden="true" />
            Cleanup
          </button>
          <button
            onClick={() => { setSettingsOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-surface-hover active:scale-[0.98] text-text-secondary text-sm
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          >
            <Settings size={16} className="text-text-muted shrink-0" aria-hidden="true" />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}