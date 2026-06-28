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
      <div className="flex gap-3 md:gap-4">
        <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={15} className="text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-text-muted mb-1.5">Tool Result</div>
          <pre className="bg-code-bg text-text-secondary text-xs p-4 rounded-xl overflow-x-auto leading-relaxed">
            {message.content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? 'bg-user-bubble' : 'bg-accent-muted'
        }`}
      >
        {isUser ? (
          <User size={15} className="text-user-bubble-text" />
        ) : (
          <Bot size={15} className="text-accent" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`group relative rounded-2xl px-4 py-3 md:px-5 md:py-3.5 max-w-[85%] sm:max-w-[80%] ${
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
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
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

          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5 rounded-sm" />
          )}

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="absolute -right-1 -top-1 sm:opacity-0 sm:group-hover:opacity-100
                p-2 rounded-xl bg-surface border border-border
                text-text-muted hover:text-text transition-all shadow-sm"
              title="Copy"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>

        <div className={`text-[11px] text-text-muted mt-1.5 px-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
