import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import {
  Trash2,
  Archive,
  RotateCcw,
  HardDrive,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

  const stats = [
    { icon: FileText, label: 'Active Chats', value: active.length },
    { icon: Archive, label: 'In Trash', value: archived.length },
    { icon: Database, label: 'Total Messages', value: totalMessages },
    { icon: HardDrive, label: 'Storage', value: 'Local' as const },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && setCleanupOpen(false)}>
      <DialogContent
        className="sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col tenshi-modal-in"
      >
        <DialogHeader
          className="px-6 py-5 border-b border-border space-y-0 flex-row items-center gap-2.5"
          style={{ paddingTop: 'max(20px, var(--safe-top))' }}
        >
          <Trash2 className="size-5 text-destructive" />
          <div>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Cleanup
            </DialogTitle>
            <DialogDescription className="sr-only">
              Manage storage, archived conversations and cache.
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <Card key={s.label} className="border-border py-4 gap-2">
                  <CardContent className="px-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <s.icon className="size-3.5" />
                      <span className="text-xs font-medium">{s.label}</span>
                    </div>
                    {typeof s.value === 'number' ? (
                      <p className="text-2xl font-bold tabular">{s.value}</p>
                    ) : (
                      <p className="text-2xl font-bold">{s.value}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Archived */}
            {archived.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Archive className="size-4" />
                  <h3 className="text-sm font-semibold">Trash</h3>
                  <Badge variant="secondary">{archived.length}</Badge>
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
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => restoreConversation(conv.id)}
                          aria-label={`Restore ${conv.title}`}
                          title="Restore"
                        >
                          <RotateCcw />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeConversation(conv.id)}
                          aria-label={`Permanently delete ${conv.title}`}
                          title="Delete permanently"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Actions</h3>

              <button
                onClick={() => handleConfirm('empty-trash')}
                disabled={archived.length === 0}
                aria-label="Empty trash"
                className={cn(
                  'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
                  confirmAction === 'empty-trash'
                    ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/30'
                    : 'border-border bg-card hover:border-destructive/50 hover:bg-muted'
                )}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-destructive/15 shrink-0">
                  <Trash2 className="size-4.5 text-destructive" />
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
                onClick={() => handleConfirm('clear-cache')}
                aria-label="Clear cache"
                className={cn(
                  'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.98]',
                  confirmAction === 'clear-cache'
                    ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                    : 'border-border bg-card hover:border-warning/50 hover:bg-muted'
                )}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-warning/15 shrink-0">
                  <HardDrive className="size-4.5 text-warning" />
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
                onClick={() => handleConfirm('delete-all')}
                aria-label="Delete everything"
                className={cn(
                  'w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 active:scale-[0.98]',
                  confirmAction === 'delete-all'
                    ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/30'
                    : 'border-border bg-card hover:border-destructive/50 hover:bg-muted'
                )}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-destructive/15 shrink-0">
                  <AlertTriangle className="size-4.5 text-destructive" />
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
        </ScrollArea>

        <DialogFooter
          className="px-6 py-4 border-t border-border"
          style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
        >
          <Button variant="outline" onClick={() => setCleanupOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}