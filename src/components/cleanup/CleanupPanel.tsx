import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import {
  X,
  Trash2,
  Archive,
  RotateCcw,
  HardDrive,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react';

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

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Cleanup dialog"
      onClick={(e) => { if (e.target === e.currentTarget) setCleanupOpen(false); }}
    >
      <div
        className="bg-bg flex flex-col shadow-xl modal-shell
          w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-border sm:mx-4
          overflow-hidden"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border"
          style={{ paddingTop: 'max(16px, var(--safe-top))' }}
        >
          <h2 className="text-lg font-semibold text-text flex items-center gap-2.5">
            <Trash2 size={20} className="text-error" aria-hidden="true" />
            Cleanup
          </h2>
          <button
            onClick={() => setCleanupOpen(false)}
            aria-label="Close cleanup panel"
            className="p-2 -mr-1 rounded-xl hover:bg-surface-hover active:scale-90 text-text-muted
              hover:text-text transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] shrink-0"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <FileText size={14} aria-hidden="true" />
                <span className="text-xs font-medium">Active Chats</span>
              </div>
              <p className="text-2xl font-bold text-text tabular">{active.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Archive size={14} aria-hidden="true" />
                <span className="text-xs font-medium">In Trash</span>
              </div>
              <p className="text-2xl font-bold text-text tabular">{archived.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Database size={14} aria-hidden="true" />
                <span className="text-xs font-medium">Total Messages</span>
              </div>
              <p className="text-2xl font-bold text-text tabular">{totalMessages}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <HardDrive size={14} aria-hidden="true" />
                <span className="text-xs font-medium">Storage</span>
              </div>
              <p className="text-2xl font-bold text-text">Local</p>
            </div>
          </div>

          {/* Archived conversations */}
          {archived.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Archive size={16} aria-hidden="true" />
                Trash ({archived.length})
              </h3>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {archived.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl
                      bg-surface border border-border"
                  >
                    <span className="text-sm text-text-secondary truncate flex-1 mr-3">
                      {conv.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => restoreConversation(conv.id)}
                        aria-label={`Restore conversation ${conv.title}`}
                        className="p-2 rounded-lg hover:bg-accent-muted text-text-muted hover:text-accent
                          active:scale-90 transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
                        title="Restore"
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => removeConversation(conv.id)}
                        aria-label={`Permanently delete conversation ${conv.title}`}
                        className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error
                          active:scale-90 transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
                        title="Delete permanently"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Actions</h3>

            <button
              onClick={() => handleConfirm('empty-trash')}
              disabled={archived.length === 0}
              aria-label="Empty trash"
              className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left
                transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] active:scale-[0.98] ${
                confirmAction === 'empty-trash'
                  ? 'border-error bg-error/10 ring-2 ring-error/30'
                  : 'border-border bg-surface hover:border-error/50 hover:bg-surface-hover'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="p-2.5 rounded-xl bg-error/15 shrink-0">
                <Trash2 size={18} className="text-error" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Empty Trash</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirmAction === 'empty-trash'
                    ? 'Click again to confirm'
                    : `Permanently delete ${archived.length} archived conversations`}
                </p>
              </div>
            </button>

            <button
              onClick={() => handleConfirm('clear-cache')}
              aria-label="Clear cache"
              className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left
                transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] active:scale-[0.98] ${
                confirmAction === 'clear-cache'
                  ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                  : 'border-border bg-surface hover:border-warning/50 hover:bg-surface-hover'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-warning/15 shrink-0">
                <HardDrive size={18} className="text-warning" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Clear Cache</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirmAction === 'clear-cache'
                    ? 'Click again to confirm'
                    : 'Remove temporary data and search cache'}
                </p>
              </div>
            </button>

            <button
              onClick={() => handleConfirm('delete-all')}
              aria-label="Delete everything"
              className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left
                transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] active:scale-[0.98] ${
                confirmAction === 'delete-all'
                  ? 'border-error bg-error/10 ring-2 ring-error/30'
                  : 'border-border bg-surface hover:border-error/50 hover:bg-surface-hover'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-error/15 shrink-0">
                <AlertTriangle size={18} className="text-error" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Delete Everything</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirmAction === 'delete-all'
                    ? 'Click again to confirm - this cannot be undone!'
                    : 'Delete all conversations, messages, and reset the app'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 sm:px-6 py-3.5 border-t border-border flex justify-end"
          style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
        >
          <button
            onClick={() => setCleanupOpen(false)}
            className="px-5 py-2.5 rounded-xl bg-surface border border-border
              text-sm font-medium text-text-secondary hover:bg-surface-hover active:scale-95
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
