import { useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PanelLeftOpen, Settings, Cpu } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Message, Attachment } from '@/types';
import { buildChatPayload, parseStreamChunk } from '@/lib/openai';
import { fetch } from '@tauri-apps/plugin-http';
import { Button } from '@/components/ui/button';

export function ChatView() {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamingContent,
    sidebarOpen,
    setSidebarOpen,
    setSettingsOpen,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    updateLastAssistantMessage,
    updateConversation,
  } = useChatStore();

  const { providers, searchConfig, agentSkills, mcpServers } = useSettingsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const provider = providers.find((p) => p.id === activeConversation?.providerId);
  const model = provider?.models.find((m) => m.id === activeConversation?.modelId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, streamingContent]);

  const handleSend = async (content: string, attachments: Attachment[] = []) => {
    if (!activeConversationId || !activeConversation || !provider || !model) return;

    const userMessage: Message = {
      id: nanoid(),
      conversationId: activeConversationId,
      role: 'user',
      content,
      attachments,
      toolCalls: [],
      toolResults: [],
      timestamp: Date.now(),
      tokenUsage: null,
    };

    addMessage(activeConversationId, userMessage);

    if (currentMessages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      updateConversation(activeConversationId, { title, updatedAt: Date.now() });
    }

    let systemPrompt = activeConversation.systemPrompt || '';
    const enabledSkills = agentSkills.filter((s) => s.isEnabled);
    if (enabledSkills.length > 0) {
      const skillsContext = enabledSkills
        .map((s) => `\n\n## Skill: ${s.name}\n${s.content}`)
        .join('');
      systemPrompt += skillsContext;
    }

    const enabledMcpServers = mcpServers.filter((s) => s.isEnabled && s.connected);
    const mcpTools = enabledMcpServers.flatMap((s) => s.tools);

    const allMessages = [...currentMessages, userMessage];
    const payload = buildChatPayload(
      allMessages,
      model.modelId,
      systemPrompt,
      mcpTools,
      model.maxOutputTokens
    );

    if (searchConfig.enabled && searchConfig.apiKey) {
      payload.tools = payload.tools || [];
      payload.tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the internet for current information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
      });
    }

    const assistantMessage: Message = {
      id: nanoid(),
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      attachments: [],
      toolCalls: [],
      toolResults: [],
      timestamp: Date.now(),
      tokenUsage: null,
    };

    addMessage(activeConversationId, assistantMessage);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      abortRef.current = new AbortController();
      const url = `${provider.baseUrl}/chat/completions`;
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      };
      const body = JSON.stringify(payload);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: abortRef.current.signal,
        connectTimeout: 30000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TenshiLLM] API Error body:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      const lines = responseText.split('\n');
      let fullContent = '';
      let fullReasoning = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const chunk = parseStreamChunk(trimmed);
        if (!chunk) continue;

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.reasoning_content) {
          fullReasoning += delta.reasoning_content;
          const displayContent = fullReasoning
            ? `<details><summary>Thinking</summary>\n\n${fullReasoning}\n\n</details>\n\n${fullContent}`
            : fullContent;
          setStreamingContent(fullContent || displayContent);
          updateLastAssistantMessage(activeConversationId, fullContent || displayContent);
        }

        if (delta.content) {
          fullContent += delta.content;
          setStreamingContent(fullContent);
          updateLastAssistantMessage(activeConversationId, fullContent);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              fullContent += `\n\n[Calling tool: ${tc.function.name}]`;
              setStreamingContent(fullContent);
              updateLastAssistantMessage(activeConversationId, fullContent);
            }
          }
        }
      }

      if (fullReasoning && !fullContent) {
        setStreamingContent(fullReasoning);
        updateLastAssistantMessage(activeConversationId, fullReasoning);
      }
    } catch (err: unknown) {
      console.error('[TenshiLLM] Catch error:', err);
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMsg = err instanceof Error ? err.message : `Unknown error: ${String(err)}`;
      updateLastAssistantMessage(activeConversationId, `Error: ${errorMsg}`);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col min-h-dvh">
        <header
          className="flex items-center justify-between px-4 md:px-6 border-b border-border bg-background"
          style={{ paddingTop: 'max(12px, var(--safe-top))', paddingBottom: '12px' }}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="-ml-1 text-muted-foreground"
          >
            <PanelLeftOpen size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="-mr-1 text-muted-foreground"
          >
            <Settings size={20} />
          </Button>
        </header>

        {/* Hero empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-5">
            <Cpu size={32} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold mb-3 tracking-tight">
            Welcome to TenshiLLM
          </h2>
          <p className="text-sm leading-relaxed text-pretty max-w-[320px] mb-8 text-muted-foreground">
            Connect any OpenAI-compatible provider and start chatting. Your data stays on this device — no cloud, no tracking.
          </p>
          <Button size="lg" onClick={() => setSettingsOpen(true)}>
            Configure your first provider
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Tip: open the sidebar with the menu icon to start a new chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header
className="flex items-center justify-between px-4 md:px-6 border-b border-border bg-background"
          style={{ paddingTop: 'max(12px, var(--safe-top))', paddingBottom: '12px' }}
        >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className={sidebarOpen ? 'lg:hidden -ml-1 text-muted-foreground' : '-ml-1 text-muted-foreground'}
          >
            <PanelLeftOpen size={20} />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold truncate leading-snug tracking-tight">
              {activeConversation.title}
            </h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success/80 shrink-0" aria-hidden="true" />
              {provider?.name} / {model?.displayName}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="-mr-1 text-muted-foreground"
        >
          <Settings size={20} />
        </Button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {currentMessages.length === 0 && (
            <div className="text-center py-20">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                <Cpu size={24} aria-hidden="true" />
              </div>
              <p className="text-base font-medium mb-1">How can I help you today?</p>
              <p className="text-sm text-muted-foreground">
                Type your message below to get started
              </p>
            </div>
          )}
          <div className="space-y-8">
            {currentMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming &&
              streamingContent &&
              activeConversationId &&
              !currentMessages.some(
                (m) => m.role === 'assistant' && m.content === streamingContent
              ) && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    conversationId: activeConversationId,
                    role: 'assistant',
                    content: streamingContent,
                    attachments: [],
                    toolCalls: [],
                    toolResults: [],
                    timestamp: Date.now(),
                    tokenUsage: null,
                  }}
                  isStreaming
                />
              )}
          </div>
        </div>
      </div>

      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        supportsVision={model?.supportsVision ?? false}
      />
    </div>
  );
}