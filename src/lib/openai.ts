import type { Message, McpTool } from '../types';

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }>;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
  }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: Array<{ type: string; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}

export function buildChatPayload(
  messages: Message[],
  model: string,
  systemPrompt: string,
  mcpTools: McpTool[],
  maxTokens: number = 4096
): ChatCompletionRequest {
  const apiMessages: ChatCompletionRequest['messages'] = [];

  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === 'user' && msg.attachments.length > 0) {
      const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const att of msg.attachments) {
        if (att.mimeType.startsWith('image/')) {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.base64Data}`, detail: 'auto' },
          });
        }
      }
      apiMessages.push({ role: msg.role, content });
    } else if (msg.role === 'tool') {
      const toolResult = msg.toolResults[0];
      if (toolResult) {
        apiMessages.push({
          role: 'tool',
          content: toolResult.content,
          tool_call_id: toolResult.toolCallId,
        });
      }
    } else if (msg.role === 'assistant' && msg.toolCalls.length > 0) {
      apiMessages.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });
    } else {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const request: ChatCompletionRequest = {
    model,
    messages: apiMessages,
    stream: true,
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  if (mcpTools.length > 0) {
    request.tools = mcpTools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  return request;
}

export interface StreamChunk {
  choices: Array<{
    delta: {
      role?: string;
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function parseStreamChunk(line: string): StreamChunk | null {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
