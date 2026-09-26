// TenshiLLM - Mobile-first AI chat client
// Copyright (C) 2026 Angel Rios
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
    const migrated = migratePersistedChatState(state, 2);
    expect(migrated.messages).toBe(state.messages);
    expect(migrated.conversations).toEqual([]);
    expect(migratePersistedChatState(state, 3)).toBe(state);
  });

  test('normalizes conversation effort selections for old persistence versions', () => {
    const state = {
      conversations: [
        { id: 'c-1', effort: 'xhigh' },
        { id: 'c-2', effort: 'nope' },
        { id: 'c-3' },
      ] as never,
      activeConversationId: null,
      messages: {},
    };

    const migrated = migratePersistedChatState(state, 2);

    expect(migrated.conversations.map((c) => c.effort)).toEqual(['xhigh', null, null]);
    expect(migratePersistedChatState(state, 3)).toBe(state);
  });
});
