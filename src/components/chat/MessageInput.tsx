import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Square, ImagePlus, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import {cn } from '@/lib/utils';

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
      if (file.size > 20 * 1024 * 1024) continue;

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

  const canSend = content.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className="border-t border-border bg-background"
      style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-4 pb-2">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative rounded-xl overflow-hidden border border-border group"
              >
                {att.mimeType.startsWith('image/') ? (
                  <img
                    src={`data:${att.mimeType};base64,${att.base64Data}`}
                    alt={att.name}
                    className="size-20 object-cover"
                  />
                ) : (
                  <div className="size-20 flex items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">
                    {att.name}
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Remove attachment ${att.name}`}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-90 transition-all duration-150"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-3">
          {supportsVision && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Image upload"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                className="shrink-0 size-11 rounded-xl"
              >
                <ImagePlus />
              </Button>
            </>
          )}

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message TenshiLLM..."
              rows={1}
              aria-label="Message input"
              className={cn(
                'w-full resize-none rounded-2xl border border-input bg-muted px-4 py-3.5',
                'text-[15px] text-foreground placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                'transition-all duration-150 leading-relaxed text-pretty min-h-[48px]'
              )}
              style={{ maxHeight: '200px' }}
            />
          </div>

          {/* Send / Stop */}
          {isStreaming ? (
            <Button
              onClick={onStop}
              size="icon"
              aria-label="Stop generation"
              variant="destructive"
              className="shrink-0 size-11 rounded-full shadow-sm"
            >
              <Square size={18} className="fill-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon"
              aria-label="Send message"
              className="shrink-0 size-11 rounded-full shadow-sm"
            >
              <Send size={18} aria-hidden="true" />
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-2.5">
          Press{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">
            Enter
          </kbd>{' '}
          to send ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">
            Shift+Enter
          </kbd>{' '}
          for new line
        </p>
      </div>
    </div>
  );
}