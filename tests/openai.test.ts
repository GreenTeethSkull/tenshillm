import { describe, expect, test } from 'bun:test';
import {
  buildChatPayload,
  chatCompletionsEndpoint,
  normalizeInlineThinking,
  parseStreamChunk,
  readOpenAiStream,
} from '../src/lib/openai';
import type { McpTool, Message } from '../src/types';

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    role: 'user',
    content: 'Hello',
    attachments: [],
    toolCalls: [],
    toolResults: [],
    timestamp: 1,
    tokenUsage: null,
    ...overrides,
  };
}

const echoTool: McpTool = {
  name: 'echo',
  title: 'Echo',
  description: 'Echoes text back to the caller',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
};

describe('OpenAI-compatible payloads', () => {
  test('accepts both provider base URLs and completion URLs', () => {
    expect(chatCompletionsEndpoint('https://example.com/v1')).toBe(
      'https://example.com/v1/chat/completions'
    );
    expect(chatCompletionsEndpoint('https://example.com/v1/chat/completions/')).toBe(
      'https://example.com/v1/chat/completions'
    );
  });

  test('keeps tool-call and tool-result messages in protocol order', () => {
    const payload = buildChatPayload(
      [
        message(),
        message({
          id: 'assistant-1',
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'call-1', name: 'echo', arguments: '{"text":"Hi"}' }],
        }),
        message({
          id: 'tool-1',
          role: 'tool',
          content: 'Hi',
          toolResults: [{ toolCallId: 'call-1', content: 'Hi', isError: false }],
        }),
      ],
      'demo-model',
      'You are helpful.',
      [echoTool],
      2048
    );

    expect(payload.stream).toBe(true);
    expect(payload.max_tokens).toBe(2048);
    expect(payload.messages.map((item) => item.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
    ]);
    expect(payload.messages[2]).toEqual({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call-1',
          type: 'function',
          function: { name: 'echo', arguments: '{"text":"Hi"}' },
        },
      ],
    });
    expect(payload.messages[3]).toEqual({
      role: 'tool',
      content: 'Hi',
      tool_call_id: 'call-1',
    });
    expect(payload.tools?.[0].function.parameters).toEqual(echoTool.inputSchema);
  });

  test('excludes incomplete assistant turns and orphaned tool results', () => {
    const payload = buildChatPayload(
      [
        message(),
        message({
          id: 'streaming-1',
          role: 'assistant',
          content: 'Partial answer',
          completionStatus: 'streaming',
        }),
        message({
          id: 'aborted-1',
          role: 'assistant',
          content: '',
          completionStatus: 'aborted',
          toolCalls: [{ id: 'aborted-call', name: 'echo', arguments: '{}' }],
        }),
        message({
          id: 'orphaned-tool-1',
          role: 'tool',
          content: 'Should not be sent',
          toolResults: [{ toolCallId: 'aborted-call', content: 'Should not be sent', isError: false }],
        }),
        message({
          id: 'error-1',
          role: 'assistant',
          content: 'Error: provider failed',
          completionStatus: 'error',
        }),
        message({
          id: 'incomplete-tool-1',
          role: 'assistant',
          content: '',
          completionStatus: 'complete',
          toolCalls: [{ id: 'missing-result-call', name: 'echo', arguments: '{}' }],
        }),
        message({
          id: 'complete-1',
          role: 'assistant',
          content: 'Final answer',
          completionStatus: 'complete',
        }),
      ],
      'demo-model',
      '',
      []
    );

    expect(payload.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Final answer' },
    ]);
  });

  test('encodes image attachments as multimodal content', () => {
    const payload = buildChatPayload(
      [
        message({
          attachments: [
            {
              id: 'image-1',
              name: 'pixel.png',
              mimeType: 'image/png',
              size: 3,
              base64Data: 'YWJj',
            },
          ],
        }),
      ],
      'vision-model',
      '',
      []
    );

    expect(payload.messages[0].content).toEqual([
      { type: 'text', text: 'Hello' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,YWJj' },
      },
    ]);
  });
});

describe('completion content normalization', () => {
  test('moves inline think blocks into reasoning and keeps the answer clean', () => {
    expect(
      normalizeInlineThinking(
        '<think>private reasoning</think>\n\nSkill hello-world invoked successfully. ✅',
        ''
      )
    ).toEqual({
      content: 'Skill hello-world invoked successfully. ✅',
      reasoning: 'private reasoning',
    });
  });

  test('keeps an unfinished initial think block visible while streaming', () => {
    expect(normalizeInlineThinking('<think>still thinking', '')).toEqual({
      content: '<think>still thinking',
      reasoning: '',
    });
  });

  test('only extracts a paired think block at the beginning', () => {
    expect(
      normalizeInlineThinking(
        '\n  <think>private reasoning</think>\nAnswer with <think>literal markup</think>',
        ''
      )
    ).toEqual({
      content: 'Answer with <think>literal markup</think>',
      reasoning: 'private reasoning',
    });
  });

  test('leaves a later think block untouched', () => {
    expect(normalizeInlineThinking('Answer <think>literal markup</think>', '')).toEqual({
      content: 'Answer <think>literal markup</think>',
      reasoning: '',
    });
  });

  test('preserves provider reasoning alongside a clean answer', () => {
    expect(normalizeInlineThinking('Final answer', 'Provider reasoning')).toEqual({
      content: 'Final answer',
      reasoning: 'Provider reasoning',
    });
  });
});

describe('OpenAI stream parsing', () => {
  test('accepts data events without a space after the colon', () => {
    const chunk = parseStreamChunk('data:{"choices":[]}');

    expect(chunk).toEqual({ choices: [] });
  });

  test('reassembles SSE events split across network chunks', async () => {
    const encoder = new TextEncoder();
    const firstEvent = `data: ${JSON.stringify({
      choices: [{ delta: { content: 'Hel' }, finish_reason: null }],
    })}\n`;
    const secondEvent = `data: ${JSON.stringify({
      choices: [{ delta: { content: 'lo' }, finish_reason: null }],
    })}\n`;
    const streamText = `${firstEvent}\n${secondEvent}\ndata: [DONE]\n`;
    const splitAt = streamText.indexOf('finish_reason') + 5;
    const networkChunks = [streamText.slice(0, splitAt), streamText.slice(splitAt)];
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          networkChunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      }),
      { headers: { 'content-type': 'text/event-stream' } }
    );
    const received: string[] = [];

    await readOpenAiStream(response, new AbortController().signal, (chunk) => {
      const content = chunk.choices[0]?.delta.content;
      if (content) received.push(content);
    });

    expect(received).toEqual(['Hel', 'lo']);
  });

  test('stops when the provider sends the done event', async () => {
    const response = new Response(
      `data: [DONE]\n\ndata: not-json\n`,
      { headers: { 'content-type': 'text/event-stream' } }
    );
    const received: unknown[] = [];

    await readOpenAiStream(response, new AbortController().signal, (chunk) => {
      received.push(chunk);
    });

    expect(received).toHaveLength(0);
  });
});
