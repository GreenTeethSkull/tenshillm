import { useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PanelLeftOpen, Settings, Cpu } from 'lucide-react';
import { nanoid } from 'nanoid';
import type {
  Attachment,
  McpServer,
  Message,
  SearchConfig,
  ToolCall,
  ToolResult,
} from '@/types';
import {
  buildChatPayload,
  chatCompletionsEndpoint,
  normalizeInlineThinking,
  readOpenAiStream,
} from '@/lib/openai';
import { callMcpTool, listMcpTools } from '@/lib/mcp';
import { describeRuntimeError, isTauriRuntime } from '@/lib/runtime';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface StreamedCompletion {
  content: string;
  reasoning: string;
  toolCalls: ToolCall[];
}

interface StreamUpdate {
  content: string;
  reasoning: string;
  toolCalls: ToolCall[];
}

const EMPTY_MESSAGES: Message[] = [];

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return error instanceof Error && (error.name === 'AbortError' || error.message === 'Request cancelled');
}

async function requestCompletion(
  baseUrl: string,
  apiKey: string,
  payload: ReturnType<typeof buildChatPayload>,
  signal: AbortSignal,
  onUpdate: (update: StreamUpdate) => void
): Promise<StreamedCompletion> {
  const requestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
    connectTimeout: 30000,
  } as RequestInit & { connectTimeout: number };
  const response = await (isTauriRuntime() ? tauriFetch : window.fetch)(
    chatCompletionsEndpoint(baseUrl),
    requestInit
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    const body = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
          tool_calls?: Array<{
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };
    const message = body.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls || [])
      .filter((toolCall) => toolCall.function?.name)
      .map((toolCall, index) => ({
        id: toolCall.id || `tool-call-${index}`,
        name: toolCall.function?.name || '',
        arguments: toolCall.function?.arguments || '{}',
      }));
    const normalized = normalizeInlineThinking(
      message?.content || '',
      message?.reasoning_content || ''
    );
    onUpdate({
      content: normalized.content,
      reasoning: normalized.reasoning,
      toolCalls,
    });
    return { ...normalized, toolCalls };
  }

  let content = '';
  let reasoning = '';
  const toolCalls = new Map<number, ToolCall>();

  await readOpenAiStream(response, signal, (chunk) => {
    const delta = chunk.choices[0]?.delta;
    if (!delta) return;

    if (delta.content) content += delta.content;
    if (delta.reasoning_content) reasoning += delta.reasoning_content;

    for (const toolCallDelta of delta.tool_calls || []) {
      const current = toolCalls.get(toolCallDelta.index) || {
        id: toolCallDelta.id || `tool-call-${toolCallDelta.index}`,
        name: '',
        arguments: '',
      };

      if (toolCallDelta.id) current.id = toolCallDelta.id;
      if (toolCallDelta.function?.name) current.name += toolCallDelta.function.name;
      if (toolCallDelta.function?.arguments) {
        current.arguments += toolCallDelta.function.arguments;
      }
      toolCalls.set(toolCallDelta.index, current);
    }

    const normalized = normalizeInlineThinking(content, reasoning);
    onUpdate({
      content: normalized.content,
      reasoning: normalized.reasoning,
      toolCalls: Array.from(toolCalls.values()),
    });
  });

  return {
    ...normalizeInlineThinking(content, reasoning),
    toolCalls: Array.from(toolCalls.values()).filter((toolCall) => toolCall.name),
  };
}

function stringifyToolResult(result: unknown): string {
  if (typeof result === 'string') return result;

  if (result && typeof result === 'object' && 'content' in result) {
    const toolResult = result as {
      content?: Array<{ type?: string; text?: string }>;
      structuredContent?: unknown;
    };
    const text = (toolResult.content || [])
      .map((item) => (item.type === 'text' && item.text ? item.text : JSON.stringify(item)))
      .join('\n');

    if (toolResult.structuredContent !== undefined) {
      return `${text}${text ? '\n\n' : ''}${JSON.stringify(toolResult.structuredContent)}`;
    }
    if (text) return text;
  }

  try {
    return JSON.stringify(result, null, 2) ?? String(result);
  } catch {
    return String(result);
  }
}

function toolResultFailed(result: unknown): boolean {
  return Boolean(
    result &&
      typeof result === 'object' &&
      'isError' in result &&
      (result as { isError?: boolean }).isError
  );
}

function canUseSearch(searchConfig: SearchConfig): boolean {
  return searchConfig.enabled &&
    (searchConfig.provider === 'duckduckgo' || Boolean(searchConfig.apiKey.trim()));
}

type UpdateMcpServer = (id: string, updates: Partial<McpServer>) => void;

async function prepareMcpServers(
  servers: McpServer[],
  updateMcpServer: UpdateMcpServer
): Promise<McpServer[]> {
  const enabledServers = servers.filter((server) => server.isEnabled);
  const preparedServers: McpServer[] = [];

  for (const server of enabledServers) {
    if (server.connected) {
      preparedServers.push(server);
      continue;
    }

    try {
      const result = await listMcpTools(server);
      const connectedServer: McpServer = {
        ...server,
        connected: true,
        tools: result.tools,
        sessionId: result.sessionId,
        protocolVersion: result.protocolVersion,
      };
      updateMcpServer(server.id, {
        connected: true,
        tools: result.tools,
        sessionId: result.sessionId,
        protocolVersion: result.protocolVersion,
      });
      preparedServers.push(connectedServer);
    } catch (error) {
      updateMcpServer(server.id, { connected: false });
      const message = describeRuntimeError(error);
      console.error(`[TenshiLLM] MCP connection failed for ${server.name}:`, error);
      toast.error(`${server.name}: ${message}`);
    }
  }

  return preparedServers;
}

async function executeToolCall(
  toolCall: ToolCall,
  serverById: Map<string, McpServer>,
  toolOwners: Map<string, string>,
  searchConfig: SearchConfig,
  updateMcpServer: UpdateMcpServer
): Promise<ToolResult> {
  let argumentsValue: unknown;
  try {
    argumentsValue = JSON.parse(toolCall.arguments || '{}');
  } catch {
    return {
      toolCallId: toolCall.id,
      content: `Invalid JSON arguments for tool ${toolCall.name}: ${toolCall.arguments}`,
      isError: true,
    };
  }

  if (toolCall.name === 'web_search') {
    try {
      if (!isTauriRuntime()) {
        throw new Error('Web search requires the Tauri desktop or mobile runtime.');
      }
      const query =
        argumentsValue && typeof argumentsValue === 'object' && 'query' in argumentsValue
          ? (argumentsValue as { query?: unknown }).query
          : undefined;
      if (typeof query !== 'string' || !query.trim()) {
        throw new Error('web_search requires a non-empty query');
      }

      const result = await invoke<unknown>('web_search', {
        provider: searchConfig.provider,
        apiKey: searchConfig.apiKey,
        query,
        maxResults: searchConfig.maxResults,
      });
      return {
        toolCallId: toolCall.id,
        content: stringifyToolResult(result),
        isError: false,
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        content: `web_search failed: ${describeRuntimeError(error)}`,
        isError: true,
      };
    }
  }

  const serverId = toolOwners.get(toolCall.name);
  const server = serverId ? serverById.get(serverId) : undefined;
  if (!server) {
    return {
      toolCallId: toolCall.id,
      content: `No connected MCP server exposes the tool ${toolCall.name}`,
      isError: true,
    };
  }

  try {
    const response = await callMcpTool(server, toolCall.name, argumentsValue);
    const updatedServer: McpServer = {
      ...server,
      connected: true,
      sessionId: response.sessionId,
      protocolVersion: response.protocolVersion,
    };
    serverById.set(server.id, updatedServer);
    updateMcpServer(server.id, {
      connected: true,
      sessionId: response.sessionId,
      protocolVersion: response.protocolVersion,
    });

    const failed = toolResultFailed(response.result);
    const content = stringifyToolResult(response.result);
    return {
      toolCallId: toolCall.id,
      content: failed ? `[MCP tool error]\n${content}` : content,
      isError: failed,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      content: `MCP tool ${toolCall.name} failed: ${describeRuntimeError(error)}`,
      isError: true,
    };
  }
}

export function ChatView() {
  const {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    sidebarOpen,
    setSidebarOpen,
    setSettingsOpen,
    addMessage,
    setIsStreaming,
    updateMessage,
    updateConversation,
  } = useChatStore();

  const {
    providers,
    searchConfig,
    agentSkills,
    mcpServers,
    defaultSystemPrompt,
    updateMcpServer,
  } = useSettingsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConversationId
    ? messages[activeConversationId] || EMPTY_MESSAGES
    : EMPTY_MESSAGES;
  const provider = providers.find((p) => p.id === activeConversation?.providerId);
  const model = provider?.models.find((m) => m.id === activeConversation?.modelId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

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

    let systemPrompt = activeConversation.systemPrompt || defaultSystemPrompt;
    const enabledSkills = agentSkills.filter((s) => s.isEnabled);
    if (enabledSkills.length > 0) {
      const skillsContext = enabledSkills
        .map((s) => `\n\n## Skill: ${s.name}\n${s.content}`)
        .join('');
      systemPrompt += skillsContext;
    }

    const assistantMessage: Message = {
      id: nanoid(),
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      attachments: [],
      toolCalls: [],
      toolResults: [],
      completionStatus: 'streaming',
      timestamp: Date.now(),
      tokenUsage: null,
    };

    addMessage(activeConversationId, assistantMessage);
    setIsStreaming(true);

    let activeAssistantId = assistantMessage.id;
    try {
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      const preparedMcpServers = model.supportsTools
        ? await prepareMcpServers(mcpServers, updateMcpServer)
        : [];
      const serverById = new Map(preparedMcpServers.map((server) => [server.id, server]));
      const toolOwners = new Map<string, string>();
      const mcpTools = model.supportsTools
        ? preparedMcpServers.flatMap((server) =>
            server.tools.filter((tool) => {
              if (toolOwners.has(tool.name)) return false;
              toolOwners.set(tool.name, server.id);
              return true;
            })
          )
        : [];

      let conversationMessages: Message[] = [...currentMessages, userMessage];
      const maxToolRounds = 8;

      for (let round = 0; round < maxToolRounds; round += 1) {
        if (signal.aborted) throw new Error('Request cancelled');

        const payload = buildChatPayload(
          conversationMessages,
          model.modelId,
          systemPrompt,
          mcpTools,
          model.maxOutputTokens
        );

        if (model.supportsTools && canUseSearch(searchConfig)) {
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

        const completion = await requestCompletion(
          provider.baseUrl,
          provider.apiKey,
          payload,
          signal,
          ({ content, reasoning, toolCalls }) => {
            updateMessage(activeConversationId, activeAssistantId, {
              content,
              reasoning,
              toolCalls,
            });
          }
        );

        const assistantForHistory: Message = {
          ...assistantMessage,
          id: activeAssistantId,
          content: completion.content,
          reasoning: completion.reasoning,
          toolCalls: completion.toolCalls,
          completionStatus: 'complete',
          timestamp: Date.now(),
        };
        conversationMessages = [...conversationMessages, assistantForHistory];
        updateMessage(activeConversationId, activeAssistantId, {
          content: completion.content,
          reasoning: completion.reasoning,
          toolCalls: completion.toolCalls,
          completionStatus: 'complete',
        });

        if (completion.toolCalls.length === 0) break;

        for (const toolCall of completion.toolCalls) {
          if (signal.aborted) throw new Error('Request cancelled');

          const toolResult = await executeToolCall(
            toolCall,
            serverById,
            toolOwners,
            searchConfig,
            updateMcpServer
          );
          const toolMessage: Message = {
            id: nanoid(),
            conversationId: activeConversationId,
            role: 'tool',
            content: toolResult.content,
            attachments: [],
            toolCalls: [],
            toolResults: [toolResult],
            timestamp: Date.now(),
            tokenUsage: null,
          };

          addMessage(activeConversationId, toolMessage);
          conversationMessages = [...conversationMessages, toolMessage];
        }

        if (round === maxToolRounds - 1) {
          throw new Error('The model exceeded the maximum number of tool call rounds');
        }
        if (signal.aborted) throw new Error('Request cancelled');

        const nextAssistantMessage: Message = {
          ...assistantMessage,
          id: nanoid(),
          content: '',
          toolCalls: [],
          completionStatus: 'streaming',
          timestamp: Date.now(),
        };
        activeAssistantId = nextAssistantMessage.id;
        addMessage(activeConversationId, nextAssistantMessage);
      }
    } catch (err: unknown) {
      const signal = abortRef.current?.signal;
      if (signal && isAbortError(err, signal)) {
        updateMessage(activeConversationId, activeAssistantId, {
          completionStatus: 'aborted',
        });
        return;
      }
      const errorMsg = err instanceof Error ? err.message : `Unknown error: ${String(err)}`;
      console.error('[TenshiLLM] Request error:', err);
      updateMessage(activeConversationId, activeAssistantId, {
        content: `Error: ${describeRuntimeError(errorMsg)}`,
        completionStatus: 'error',
      });
    } finally {
      setIsStreaming(false);
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
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="-ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted-bg transition-colors"
          >
            <PanelLeftOpen size={20} />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="-mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted-bg transition-colors"
          >
            <Settings size={20} />
          </button>
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
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition-[background-color,border-color,color,opacity,box-shadow,transform]"
          >
            Configure your first provider
          </button>
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
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="-ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted-bg transition-colors"
          >
            <PanelLeftOpen size={20} />
          </button>
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
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="-mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted-bg transition-colors"
        >
          <Settings size={20} />
        </button>
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
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming && msg.role === 'assistant' && msg.completionStatus === 'streaming'
                }
              />
            ))}
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
