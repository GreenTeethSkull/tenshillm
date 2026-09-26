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

import type { Conversation, Message } from '../types';
import { isEffort } from './effort';

export interface PersistedChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
}

const LEGACY_THINKING_PATTERN =
  /^<details><summary>Thinking<\/summary>\n\n([\s\S]*?)\n\n<\/details>\n\n([\s\S]*)$/;

export function migrateLegacyAssistantMessage(message: Message): Message {
  if (message.role !== 'assistant' || message.reasoning) return message;

  const match = LEGACY_THINKING_PATTERN.exec(message.content);
  if (!match) return message;

  return {
    ...message,
    content: match[2],
    reasoning: match[1],
  };
}

export function migrateLegacyMessages(
  messages: Record<string, Message[]>
): Record<string, Message[]> {
  return Object.fromEntries(
    Object.entries(messages).map(([conversationId, conversationMessages]) => [
      conversationId,
      conversationMessages.map(migrateLegacyAssistantMessage),
    ])
  );
}

// Conversations persisted before effort support have no selection; unknown
// values (hand-edited storage) fall back to "follow the model default".
export function migrateLegacyConversations(conversations: Conversation[]): Conversation[] {
  return (Array.isArray(conversations) ? conversations : []).map((conversation) => ({
    ...conversation,
    effort: isEffort(conversation.effort) ? conversation.effort : null,
  }));
}

export function migratePersistedChatState(
  state: PersistedChatState,
  version: number
): PersistedChatState {
  if (version >= 3) return state;

  return {
    ...state,
    messages: version < 2 ? migrateLegacyMessages(state.messages) : state.messages,
    conversations: migrateLegacyConversations(state.conversations),
  };
}

export function isCompleteAssistantMessage(message: Message): boolean {
  return (
    message.role !== 'assistant' ||
    !message.completionStatus ||
    message.completionStatus === 'complete'
  );
}
