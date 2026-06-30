import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, Wrench } from 'lucide-react';
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
      <article className="flex gap-3 md:gap-4" aria-label="Tool response">
        <div className="grid place-items-center size-8 rounded-lg bg-warning/15 text-warning shrink-0 mt-0.5">
          <Wrench size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Tool Result</div>
          <pre className="bg-code-bg text-text-secondary text-xs p-4 rounded-xl overflow-x-auto leading-relaxed font-mono">
            {message.content}
          </pre>
        </div>
      </article>
    );
  }

  return (
    <div className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`grid place-items-center size-8 rounded-lg shrink-0 mt-0.5 ${
          isUser ? 'bg-user-bubble text-user-bubble-text' : 'bg-accent-muted text-accent'
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User size={16} aria-hidden="true" />
        ) : (
          <Bot size={16} aria-hidden="true" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`group relative rounded-2xl px-4 py-3 md:px-5 md:py-3.5
            max-w-[85%] sm:max-w-[80%] md:max-w-[75%]
            shadow-sm ${
            isUser
              ? 'bg-user-bubble text-user-bubble-text'
              : 'bg-assistant-bubble text-assistant-bubble-text'
          }`}
        >
          {message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="text-xs bg-black/10 rounded-xl px-2.5 py-1.5"
                >
                  {att.mimeType.startsWith('image/') ? (
                    <img
                      src={`data:${att.mimeType};base64,${att.base64Data}`}
                      alt={att.name}
                      className="max-w-48 max-h-48 rounded-lg object-cover"
                    />
                  ) : (
                    <span>{att.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-pretty">{message.content}</p>
          ) : (
            <div className="markdown-body text-[15px]">
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

          {isStreaming && !message.content && (
            <span className="thinking-dots" aria-label="Assistant is thinking">
              <span />
              <span />
              <span />
            </span>
          )}

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied to clipboard' : 'Copy message to clipboard'}
              className="absolute -right-2 -top-2 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100
                grid place-items-center size-7 rounded-lg
                bg-surface border border-border
                text-text-muted hover:text-text active:scale-90
                transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] shadow-sm"
              title="Copy"
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>
          )}
        </div>

        <time
          className={`text-[11px] text-text-muted mt-1.5 px-1 tabular ${isUser ? 'text-right' : ''}`}
          dateTime={new Date(message.timestamp).toISOString()}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  );
}
