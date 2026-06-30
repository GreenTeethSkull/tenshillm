import { useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PanelLeftOpen, Settings, Cpu, MessageSquare } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Message, Attachment } from '../../types';
import { buildChatPayload, parseStreamChunk } from '../../lib/openai';
import { fetch } from '@tauri-apps/plugin-http';

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
      const skillsContext = enabledSkills.map((s) => `\n\n## Skill: ${s.name}\n${s.content}`).join('');
      systemPrompt += skillsContext;
    }

    const enabledMcpServers = mcpServers.filter((s) => s.isEnabled && s.connected);
    const mcpTools = enabledMcpServers.flatMap((s) => s.tools);

    const allMessages = [...currentMessages, userMessage];
    const payload = buildChatPayload(allMessages, model.modelId, systemPrompt, mcpTools, model.maxOutputTokens);

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
      let chunkCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const chunk = parseStreamChunk(trimmed);
        if (!chunk) continue;

        chunkCount++;
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.reasoning_content) {
          fullReasoning += delta.reasoning_content;
          const displayContent = fullReasoning
            ? `<details><summary>🤔 Thinking...</summary>\n\n${fullReasoning}\n\n</details>\n\n${fullContent}`
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
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted px-6 min-h-dvh">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="absolute p-2.5 rounded-xl
              bg-surface/90 backdrop-blur-sm border border-border
              hover:bg-surface-hover active:scale-90 text-text-secondary
              transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
              lg:hidden"
            style={{
              top: 'max(12px, var(--safe-top))',
              left: 'max(12px, var(--safe-left))',
            }}
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
          </button>
        )}
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="grid place-items-center size-16 rounded-2xl bg-accent/10 text-accent mb-5">
            <Cpu size={32} className="text-accent" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2 tracking-tight">TenshiLLM</h2>
          <p className="text-sm text-text-muted mb-8 leading-relaxed text-pretty max-w-[280px]">
            Connect any OpenAI-compatible provider and start chatting. Your data stays on this device.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[260px]">
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium
                hover:bg-accent-hover active:scale-[0.98] transition-all duration-[var(--duration-base)]
                ease-[var(--ease-out)] shadow-sm"
            >
              Configure provider
            </button>
            <p className="text-xs text-text-muted mt-2">
              Tip: open the sidebar to start a new chat once a provider is set.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header — sticky with safe-area and motion-safe blur */}
      <header
        className="flex items-center justify-between px-4 md:px-6 border-b border-border bg-bg/70 backdrop-blur-md supports-[backdrop-filter]:bg-bg/60"
        style={{ paddingTop: 'max(8px, var(--safe-top))' }}
      >
        <div className="flex items-center gap-3 min-w-0 py-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 -ml-1 rounded-xl hover:bg-surface-hover active:scale-90 text-text-muted
                hover:text-text transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
                shrink-0 lg:hidden"
            >
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text truncate leading-snug">
              {activeConversation.title}
            </h2>
            <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success/80 shrink-0" aria-hidden="true" />
              {provider?.name} / {model?.displayName}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="p-2 -mr-1 rounded-xl hover:bg-surface-hover active:scale-90 text-text-muted
            hover:text-text transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]
            shrink-0"
        >
          <Settings size={18} aria-hidden="true" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-3xl mx-auto space-y-5 md:space-y-6">
          {currentMessages.length === 0 && (
            <div className="text-center py-16 md:py-24">
              <div className="grid place-items-center size-14 rounded-2xl bg-accent/10 text-accent mx-auto mb-4">
                <MessageSquare size={22} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-text-secondary mb-1">Start a conversation</p>
              <p className="text-xs text-text-muted">Type a message below to begin</p>
            </div>
          )}
          {currentMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && streamingContent && activeConversationId && !currentMessages.some(
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

      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        supportsVision={model?.supportsVision ?? false}
      />
    </div>
  );
}
