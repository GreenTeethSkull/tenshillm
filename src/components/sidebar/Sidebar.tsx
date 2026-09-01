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

import {
  Plus,
  MessageSquare,
  Settings,
  Trash2,
  PanelLeftClose,
} from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ScrollShadow } from '@heroui/react';
import { cn } from '@/lib/utils';
import brandMark from '@/assets/brand/tenshillm-mark-master.webp';

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

  const {
    providers,
    activeProviderId,
    activeModelId,
    defaultSystemPrompt,
  } = useSettingsStore();

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const activeModel = activeProvider?.models.find((m) => m.id === activeModelId);

  const handleNewChat = () => {
    if (!activeProviderId || !activeModelId) {
      setSettingsOpen(true);
      setSidebarOpen(false);
      return;
    }
    createNewConversation(activeProviderId, activeModelId, defaultSystemPrompt);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const visibleConversations = conversations.filter((c) => !c.isArchived);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden tenshi-backdrop-in"
          style={{ backgroundColor: 'var(--code-bg)' }}
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
            <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-primary/15 text-primary shrink-0">
              <img src={brandMark} alt="" className="size-8 scale-150 object-contain" />
            </span>
            <h1 className="text-base font-semibold tracking-tight truncate">
              TenshiLLM
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat CTA */}
        <div className="px-3 py-4 space-y-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition-[background-color,border-color,color,opacity,box-shadow,transform]"
          >
            <Plus size={16} aria-hidden="true" />
            New Chat
          </button>
          {activeProvider && activeModel ? (
            <div className="flex items-center gap-2 px-2">
              <span
                className="size-1.5 rounded-full bg-success shrink-0"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-foreground truncate">
                {activeProvider.name} / {activeModel.displayName}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-2">
              No provider configured —{' '}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  setSidebarOpen(false);
                }}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                set one up
              </button>
            </p>
          )}
        </div>

        {/* Conversation list */}
        <ScrollShadow
          className="flex-1 px-3 overflow-y-auto"
          orientation="vertical"
          size={8}
        >
          <nav aria-label="Conversations" className="pb-2 conv-stagger">
            {visibleConversations.length === 0 ? (
              <div className="flex flex-col items-center text-center px-4 py-12">
                <span className="grid size-12 place-items-center rounded-2xl bg-muted-bg text-muted-foreground mb-3">
                  <MessageSquare size={20} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 text-pretty max-w-[220px]">
                  Start a new chat to talk with your model. Your history will appear here.
                </p>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="px-3 h-8 rounded-lg border border-border text-sm hover:bg-sidebar-accent transition-colors"
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
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConversation(conv.id);
                            if (window.innerWidth < 1024) setSidebarOpen(false);
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'group w-full flex items-center gap-2.5 pl-4 pr-10 py-2.5 rounded-lg cursor-pointer text-left',
                            'transition-colors duration-150',
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
                          <span className="min-w-0 flex-1 text-sm truncate leading-snug">
                            {conv.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveConversation(conv.id)}
                          aria-label={`Move ${conv.title} to trash`}
                          title="Move to trash"
                          className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </ScrollShadow>

        <div className="h-px bg-sidebar-border" />

        {/* Footer nav */}
        <div
          className="px-3 py-3 space-y-1"
          style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
            onClick={() => {
              setCleanupOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Cleanup
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
            onClick={() => {
              setSettingsOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Settings size={16} aria-hidden="true" />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
