import { describe, expect, test } from 'bun:test';
import {
  migrateLegacyAssistantMessage,
  migratePersistedChatState,
} from '../src/lib/chatHistory';
import type { Message } from '../src/types';

function assistantMessage(content: string, overrides: Partial<Message> = {}): Message {
  return {
    id: 'assistant-1',
    conversationId: 'conversation-1',
    role: 'assistant',
    content,
    attachments: [],
    toolCalls: [],
    toolResults: [],
    timestamp: 1,
    tokenUsage: null,
    ...overrides,
  };
}

describe('chat history migration', () => {
  test('moves legacy Thinking markup into reasoning and clean content', () => {
    const message = assistantMessage(
      '<details><summary>Thinking</summary>\n\nprivate reasoning\n\n</details>\n\nFinal answer'
    );

    expect(migrateLegacyAssistantMessage(message)).toEqual({
      ...message,
      content: 'Final answer',
      reasoning: 'private reasoning',
    });
  });

  test('leaves unrelated assistant content unchanged', () => {
    const message = assistantMessage('Answer with <details>literal markup</details>');

    expect(migrateLegacyAssistantMessage(message)).toBe(message);
  });

  test('migrates all conversations only for the old persistence version', () => {
    const message = assistantMessage(
      '<details><summary>Thinking</summary>\n\nreasoning\n\n</details>\n\nanswer'
    );
    const state = {
      conversations: [],
      activeConversationId: null,
      messages: { 'conversation-1': [message] },
    };

    expect(migratePersistedChatState(state, 1).messages['conversation-1'][0]).toMatchObject({
      content: 'answer',
      reasoning: 'reasoning',
    });
    expect(migratePersistedChatState(state, 2)).toBe(state);
  });
});
