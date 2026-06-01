import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check } from 'lucide-react';
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
      <div className="flex gap-3 max-w-3xl mx-auto">
        <div className="w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <Bot size={14} className="text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-muted mb-1">Tool Result</div>
          <pre className="bg-code-bg text-text-secondary text-xs p-3 rounded-lg overflow-x-auto">
            {message.content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 max-w-3xl mx-auto ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-user-bubble' : 'bg-accent-muted'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-user-bubble-text" />
        ) : (
          <Bot size={14} className="text-accent" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`group relative rounded-2xl px-4 py-2.5 max-w-full ${
            isUser
              ? 'bg-user-bubble text-user-bubble-text'
              : 'bg-assistant-bubble text-assistant-bubble-text'
          }`}
        >
          {message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="text-xs bg-black/10 rounded-lg px-2 py-1"
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
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="markdown-body text-sm">
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

          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
          )}

          {/* Copy button */}
          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100
                p-1.5 rounded-lg bg-surface border border-border
                text-text-muted hover:text-text transition-all"
              title="Copy"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-text-muted mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
