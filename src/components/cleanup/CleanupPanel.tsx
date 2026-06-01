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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Trash2 size={20} className="text-error" />
            Cleanup
          </h2>
          <button
            onClick={() => setCleanupOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <FileText size={14} />
                <span className="text-xs">Active Chats</span>
              </div>
              <p className="text-2xl font-bold text-text">{active.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <Archive size={14} />
                <span className="text-xs">In Trash</span>
              </div>
              <p className="text-2xl font-bold text-text">{archived.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <Database size={14} />
                <span className="text-xs">Total Messages</span>
              </div>
              <p className="text-2xl font-bold text-text">{totalMessages}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <HardDrive size={14} />
                <span className="text-xs">Storage</span>
              </div>
              <p className="text-2xl font-bold text-text">Local</p>
            </div>
          </div>

          {/* Archived conversations - restore or delete */}
          {archived.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Archive size={16} />
                Trash ({archived.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {archived.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                      bg-surface border border-border"
                  >
                    <span className="text-sm text-text-secondary truncate flex-1 mr-2">
                      {conv.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => restoreConversation(conv.id)}
                        className="p-1 rounded hover:bg-accent-muted text-text-muted hover:text-accent"
                        title="Restore"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => removeConversation(conv.id)}
                        className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error"
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
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

            {/* Empty Trash */}
            <button
              onClick={() => handleConfirm('empty-trash')}
              disabled={archived.length === 0}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                confirmAction === 'empty-trash'
                  ? 'border-error bg-error/10 ring-2 ring-error/30'
                  : 'border-border bg-surface hover:border-error/50'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="p-2 rounded-lg bg-error/20">
                <Trash2 size={18} className="text-error" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">Empty Trash</p>
                <p className="text-xs text-text-muted">
                  {confirmAction === 'empty-trash'
                    ? 'Click again to confirm'
                    : `Permanently delete ${archived.length} archived conversations`}
                </p>
              </div>
            </button>

            {/* Clear Cache */}
            <button
              onClick={() => handleConfirm('clear-cache')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                confirmAction === 'clear-cache'
                  ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                  : 'border-border bg-surface hover:border-warning/50'
              }`}
            >
              <div className="p-2 rounded-lg bg-warning/20">
                <HardDrive size={18} className="text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">Clear Cache</p>
                <p className="text-xs text-text-muted">
                  {confirmAction === 'clear-cache'
                    ? 'Click again to confirm'
                    : 'Remove temporary data and search cache'}
                </p>
              </div>
            </button>

            {/* Delete All */}
            <button
              onClick={() => handleConfirm('delete-all')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                confirmAction === 'delete-all'
                  ? 'border-error bg-error/10 ring-2 ring-error/30'
                  : 'border-border bg-surface hover:border-error/50'
              }`}
            >
              <div className="p-2 rounded-lg bg-error/20">
                <AlertTriangle size={18} className="text-error" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">Delete Everything</p>
                <p className="text-xs text-text-muted">
                  {confirmAction === 'delete-all'
                    ? 'Click again to confirm - this cannot be undone!'
                    : 'Delete all conversations, messages, and reset the app'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex justify-end">
          <button
            onClick={() => setCleanupOpen(false)}
            className="px-4 py-2 rounded-lg bg-surface border border-border
              text-sm text-text-secondary hover:bg-surface-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
