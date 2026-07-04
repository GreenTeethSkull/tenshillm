import {
  Plus,
  MessageSquare,
  Settings,
  Trash2,
  PanelLeftClose,
  Archive,
} from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
          className="fixed inset-0 z-40 lg:hidden tenshi-backdrop-in"
          style={{ backgroundColor: 'hsl(var(--code-bg))' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed lg:relative h-full w-[280px] flex flex-col',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'
        )}
        style={{ zIndex: 50 }}
        aria-label="Conversation navigation"
      >
        {/* Brand header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border"
          style={{ paddingTop: 'max(16px, var(--safe-top))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary shrink-0">
              <MessageSquare size={17} className="text-primary" aria-hidden="true" />
            </span>
            <h1 className="text-base font-semibold tracking-tight truncate">
              TenshiLLM
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden text-muted-foreground"
          >
            <PanelLeftClose />
          </Button>
        </div>

        {/* New Chat CTA */}
        <div className="px-3 py-4 space-y-3">
          <Button onClick={handleNewChat} className="w-full" size="default">
            <Plus />
            New Chat
          </Button>
          {activeProvider && activeModel && (
            <div className="flex items-center gap-2 px-2">
              <span className="size-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
              <p className="text-xs text-muted-foreground truncate">
                {activeProvider.name} / {activeModel.displayName}
              </p>
            </div>
          )}
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-3">
          <nav aria-label="Conversations" className="pb-2 conv-stagger">
            {visibleConversations.length === 0 ? (
              <div className="flex flex-col items-center text-center px-4 py-12">
                <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                  <MessageSquare size={20} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 text-pretty max-w-[220px]">
                  Start a new chat to talk with your model. Your history will appear here.
                </p>
                <Button variant="outline" size="sm" onClick={handleNewChat}>
                  + New chat
                </Button>
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
                        className={cn(
                          'group relative w-full flex items-center gap-2.5 pl-4 pr-2 py-2.5 rounded-lg',
                          'text-left transition-colors duration-150',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80'
                        )}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        )}
                        <MessageSquare
                          size={15}
                          className={cn(
                            'shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1 text-sm truncate leading-snug">
                          {conv.title}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
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
                              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-150 shrink-0"
                            >
                              <Archive size={14} aria-hidden="true" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right">Archive</TooltipContent>
                        </Tooltip>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Footer nav */}
        <div
          className="px-3 py-3 space-y-1"
          style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => {
              setCleanupOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Trash2 />
            Cleanup
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => {
              setSettingsOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Settings />
            Settings
          </Button>
        </div>
      </aside>
    </>
  );
}