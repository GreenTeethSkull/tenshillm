import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import {
  Trash2,
  Archive,
  RotateCcw,
  HardDrive,
  AlertTriangle,
  FileText,
  Database,
  X,
  Download,
} from 'lucide-react';
import { ScrollShadow } from '@heroui/react';
import { Modal } from '@/components/Overlay';
import { GhostButton, IconGhostButton } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { describeRuntimeError, isTauriRuntime } from '@/lib/runtime';

export function CleanupPanel() {
  const {
    conversations,
    messages,
    setCleanupOpen,
    removeConversation,
    restoreConversation,
    deleteArchivedConversations,
    deleteAllConversations,
  } = useChatStore();
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const resetTheme = useThemeStore((state) => state.resetTheme);

  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const archived = conversations.filter((c) => c.isArchived);
  const active = conversations.filter((c) => !c.isArchived);
  const totalMessages = Object.values(messages).reduce((sum, msgs) => sum + msgs.length, 0);

  const handleConfirm = (action: string) => {
    if (confirmAction === action) {
      switch (action) {
        case 'empty-trash':
          deleteArchivedConversations();
          break;
        case 'delete-all':
          deleteAllConversations();
          resetSettings();
          resetTheme();
          localStorage.removeItem('tenshillm-search-cache');
          break;
        case 'clear-cache':
          localStorage.removeItem('tenshillm-search-cache');
          break;
      }
      setConfirmAction(null);
    } else {
      setConfirmAction(action);
    }
  };

  const handleExport = async () => {
    const backup = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        conversations,
        messages,
      },
      null,
      2
    );

    try {
      if (!isTauriRuntime()) {
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tenshillm-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Conversations exported');
        return;
      }

      const filePath = await save({
        defaultPath: `tenshillm-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON backup', extensions: ['json'] }],
      });
      if (!filePath) return;

      await writeTextFile(filePath, backup);
      toast.success('Conversations exported');
    } catch (error) {
      toast.error(`Export failed: ${describeRuntimeError(error)}`);
    }
  };

  const stats = [
    { icon: FileText, label: 'Active Chats', value: active.length },
    { icon: Archive, label: 'In Trash', value: archived.length },
    { icon: Database, label: 'Total Messages', value: totalMessages },
    { icon: HardDrive, label: 'Storage', value: 'Local' as const },
  ];

  return (
    <Modal onClose={() => setCleanupOpen(false)} label="Cleanup">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-5 border-b border-border"
        style={{ paddingTop: 'max(20px, var(--safe-top))' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-destructive/15 text-destructive">
            <Trash2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Cleanup</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage storage, archived conversations and cache.
            </p>
          </div>
        </div>
        <IconGhostButton onClick={() => setCleanupOpen(false)} ariaLabel="Close cleanup">
          <X size={18} />
        </IconGhostButton>
      </header>

      <ScrollShadow className="flex-1 overflow-y-auto" orientation="vertical" size={8}>
        <div className="px-6 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <s.icon className="size-3.5" aria-hidden="true" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                {typeof s.value === 'number' ? (
                  <p className="text-2xl font-bold tabular">{s.value}</p>
                ) : (
                  <p className="text-2xl font-bold">{s.value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Archived */}
          {archived.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="size-4" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Trash</h3>
                <span className="h-5 px-1.5 rounded text-[10px] font-medium bg-muted-bg border border-border text-muted-foreground inline-flex items-center">
                  {archived.length}
                </span>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {archived.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border"
                  >
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {conv.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconGhostButton
                        onClick={() => restoreConversation(conv.id)}
                        ariaLabel={`Restore ${conv.title}`}
                        title="Restore"
                        className="hover:text-primary size-7"
                      >
                        <RotateCcw size={14} />
                      </IconGhostButton>
                      <IconGhostButton
                        onClick={() => removeConversation(conv.id)}
                        ariaLabel={`Permanently delete ${conv.title}`}
                        title="Delete permanently"
                        className="hover:text-destructive size-7"
                      >
                        <Trash2 size={14} />
                      </IconGhostButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Actions</h3>

            <GhostButton
              onClick={() => void handleExport()}
              className="w-full justify-start h-auto p-4 rounded-xl border border-border bg-card hover:bg-muted-bg"
            >
              <Download className="size-4" aria-hidden="true" />
              <span className="text-sm font-medium">Export conversations</span>
            </GhostButton>

            <button
              type="button"
              onClick={() => handleConfirm('empty-trash')}
              disabled={archived.length === 0}
              aria-label="Empty trash"
              className={cn(
                'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
                confirmAction === 'empty-trash'
                  ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/30'
                  : 'border-border bg-card hover:border-destructive/50 hover:bg-muted-bg'
              )}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-destructive/15 shrink-0">
                <Trash2 className="size-4.5 text-destructive" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Empty Trash</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {confirmAction === 'empty-trash'
                    ? 'Click again to confirm'
                    : `Permanently delete ${archived.length} archived conversations`}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleConfirm('clear-cache')}
              aria-label="Clear cache"
              className={cn(
                'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
                confirmAction === 'clear-cache'
                  ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                  : 'border-border bg-card hover:border-warning/50 hover:bg-muted-bg'
              )}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-warning/15 shrink-0">
                <HardDrive className="size-4.5 text-warning" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Clear Cache</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {confirmAction === 'clear-cache'
                    ? 'Click again to confirm'
                    : 'Remove temporary data and search cache'}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleConfirm('delete-all')}
              aria-label="Delete everything"
              className={cn(
                'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
                confirmAction === 'delete-all'
                  ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/30'
                  : 'border-border bg-card hover:border-destructive/50 hover:bg-muted-bg'
              )}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-destructive/15 shrink-0">
                <AlertTriangle className="size-4.5 text-destructive" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Delete Everything</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {confirmAction === 'delete-all'
                    ? 'Click again to confirm — this cannot be undone!'
                    : 'Delete all conversations, messages and reset the app'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </ScrollShadow>

      {/* Footer */}
      <footer
        className="flex items-center justify-end px-6 py-4 border-t border-border"
        style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
      >
        <GhostButton onClick={() => setCleanupOpen(false)}>Close</GhostButton>
      </footer>
    </Modal>
  );
}
