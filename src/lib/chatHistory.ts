import type { Conversation, Message } from '../types';

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

export function migratePersistedChatState(
  state: PersistedChatState,
  version: number
): PersistedChatState {
  if (version >= 2) return state;

  return {
    ...state,
    messages: migrateLegacyMessages(state.messages),
  };
}

export function isCompleteAssistantMessage(message: Message): boolean {
  return (
    message.role !== 'assistant' ||
    !message.completionStatus ||
    message.completionStatus === 'complete'
  );
}
