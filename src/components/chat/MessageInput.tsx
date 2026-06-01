import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Square, ImagePlus, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Attachment } from '../../types';

interface Props {
  onSend: (content: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  supportsVision: boolean;
}

export function MessageInput({ onSend, onStop, isStreaming, supportsVision }: Props) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isStreaming) return;
    onSend(trimmed, attachments);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) continue; // 20MB limit

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const attachment: Attachment = {
          id: nanoid(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64Data: base64,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="border-t border-border bg-bg p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded-lg overflow-hidden border border-border"
            >
              {att.mimeType.startsWith('image/') ? (
                <img
                  src={`data:${att.mimeType};base64,${att.base64Data}`}
                  alt={att.name}
                  className="w-20 h-20 object-cover"
                />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center bg-surface text-xs text-text-muted p-2 text-center">
                  {att.name}
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full
                  bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image upload button */}
        {supportsVision && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-surface border border-border
                text-text-muted hover:text-text hover:bg-surface-hover
                transition-colors shrink-0"
              title="Attach image"
            >
              <ImagePlus size={18} />
            </button>
          </>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={1}
            className="w-full resize-none rounded-xl border border-border
              bg-surface px-4 py-2.5 text-sm text-text
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              transition-colors"
            style={{ maxHeight: '200px' }}
          />
        </div>

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-2.5 rounded-xl bg-error text-white
              hover:bg-error/80 transition-colors shrink-0"
            title="Stop"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!content.trim() && attachments.length === 0}
            className="p-2.5 rounded-xl bg-accent text-white
              hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors shrink-0"
            title="Send"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
