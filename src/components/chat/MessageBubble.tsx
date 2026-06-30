import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Copy, Check, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isTool) {
    return (
      <article className="flex gap-4" aria-label="Tool response">
        <div className="grid place-items-center size-9 rounded-lg bg-warning/15 text-warning shrink-0">
          <Wrench size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold text-text-muted mb-2 uppercase tracking-wider">
            Tool Result
          </div>
          <pre className="bg-code-bg text-text-secondary text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono border border-border">
            {message.content}
          </pre>
        </div>
      </article>
    );
  }

  if (isUser) {
    // User message: right-aligned, subtle bubble, generous padding
    return (
      <div className="flex justify-end">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] gap-1.5">
          <div
            className="rounded-2xl rounded-tr-md px-5 py-3
              bg-user-bubble text-user-bubble-text
              shadow-sm"
          >
            {message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.attachments.map((att) => (
                  <div key={att.id} className="rounded-lg overflow-hidden bg-black/10">
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={`data:${att.mimeType};base64,${att.base64Data}`}
                        alt={att.name}
                        className="max-w-48 max-h-48 object-cover"
                      />
                    ) : (
                      <span className="block px-3 py-2 text-xs">{att.name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-pretty">
              {message.content}
            </p>
          </div>
          <time
            className="text-[11px] text-text-muted px-1 tabular"
            dateTime={new Date(message.timestamp).toISOString()}
          >
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </div>
    );
  }

  // Assistant message: NO BUBBLE — full width with avatar (Claude/ChatGPT style)
  return (
    <article className="flex gap-4 group">
      <div
        className="grid place-items-center size-9 rounded-lg bg-accent-muted text-accent shrink-0"
        aria-hidden="true"
      >
        <Bot size={18} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-text">Assistant</span>
          {!isStreaming && message.content && (
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied to clipboard' : 'Copy message to clipboard'}
              className="grid place-items-center size-7 rounded-md
                text-text-muted hover:text-text hover:bg-surface-hover active:scale-90
                transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
                opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              title="Copy"
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          )}
        </div>

        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.attachments.map((att) => (
              <img
                key={att.id}
                src={`data:${att.mimeType};base64,${att.base64Data}`}
                alt={att.name}
                className="max-w-48 max-h-48 rounded-lg object-cover border border-border"
              />
            ))}
          </div>
        )}

        {isStreaming && !message.content ? (
          <div className="thinking-dots py-1" aria-label="Assistant is thinking">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code {...props}>{children}</code>;
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {isStreaming && message.content && (
          <span
            className="inline-block w-1.5 h-4 bg-accent ml-0.5 rounded-sm align-text-bottom animate-pulse"
            aria-hidden="true"
          />
        )}

        <time
          className="block text-[11px] text-text-muted mt-2 tabular"
          dateTime={new Date(message.timestamp).toISOString()}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </article>
  );
}