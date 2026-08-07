# Chat Management and Default System Prompt

## Context

The chat store already supports archiving, restoring, and deleting conversations, but the sidebar action is visually hidden until hover and does not clearly communicate that a conversation can be moved to the Trash. Cleanup already has a `deleteAllConversations` store action, while its existing `Delete Everything` action also resets application settings. The Skills panel stores a configurable default system prompt but does not offer a direct way to restore its built-in value.

## Goals

- Make the per-conversation Trash action visible in the sidebar.
- Move one conversation to the Trash immediately and keep it recoverable.
- Add a Cleanup action that permanently removes all active and archived conversations and their messages without changing application settings.
- Keep the existing `Delete Everything` action unchanged.
- Add a Skills-panel control to restore the default system prompt.
- Preserve the existing visual language and responsive behavior.

## Non-goals

- No changes to providers, themes, MCP servers, skills, search settings, or other settings when deleting chats.
- No permanent deletion control in the sidebar.
- No changes to system prompts already stored on existing conversations when reverting the default prompt.
- No redesign of Cleanup, Settings, or the conversation list.

## Design

### Sidebar conversation action

The existing sidebar action will remain backed by `archiveConversation`, because archiving is the current Trash workflow. Its control will:

- use a visible trash icon instead of being hidden with `opacity-0`;
- remain available on desktop and mobile without depending on hover;
- expose an accessible label and title indicating that it moves the conversation to Trash;
- execute immediately without a confirmation step.

When the archived conversation is currently active, `archiveConversation` will also clear `activeConversationId`. The conversation and its messages will remain in the store so Cleanup can restore it. Restoring a conversation will not automatically select it.

### Cleanup bulk chat deletion

Cleanup will add a `Delete All Chats` action before the existing `Delete Everything` action. It will use the existing two-step confirmation pattern used by destructive Cleanup actions.

On confirmation, the action will call `deleteAllConversations`, which clears:

- active conversations;
- archived conversations;
- the message map for all conversations;
- the active conversation selection.

It will not call `resetSettings`, `resetTheme`, or remove the search cache. The existing `Delete Everything` action will retain its current behavior, including resetting settings and theme. The new action will be disabled when there are no conversations to delete.

### Default system prompt revert

The built-in prompt will be declared once as an exported `DEFAULT_SYSTEM_PROMPT` constant in `settingsStore.ts`:

```text
You are a helpful AI assistant.
```

The initial state and `resetSettings` will use this constant. The Skills panel will render a compact `Revert` button beside the `Default System Prompt` label. Pressing it will call `setDefaultSystemPrompt(DEFAULT_SYSTEM_PROMPT)`, which already persists the value immediately. The button will be disabled when the current value already matches the default.

The change affects the default used for new conversations and fallback behavior. Existing conversations keep their own stored `systemPrompt` value.

## Data Flow and Persistence

1. The sidebar invokes `archiveConversation(conversationId)`.
2. The chat store marks the conversation archived and clears the active selection when needed.
3. Zustand persistence writes the updated conversations, active ID, and messages to `tenshillm-chat`.
4. Cleanup invokes `deleteAllConversations` after the second confirmation click.
5. The chat store persists an empty conversation and message set while leaving `tenshillm-settings` unchanged.
6. Skills invokes `setDefaultSystemPrompt`, which updates the settings state and persists `tenshillm-settings` immediately.

All operations are local synchronous state changes. No network or Tauri command is involved.

## Error Handling and Safety

- Single-chat deletion is intentionally immediate because the action only moves the conversation to recoverable Trash.
- Bulk deletion keeps the existing two-click confirmation to reduce accidental permanent loss.
- The bulk action will not reset or mutate settings.
- Existing error handling and toast behavior remain unchanged because these operations do not introduce asynchronous work.

## Testing and Acceptance Criteria

- Store tests verify that archiving the active conversation clears the active ID while preserving the conversation and its messages.
- Store tests verify that deleting all conversations removes active and archived conversations and messages while preserving settings state.
- Settings tests verify that the shared default constant is used by initial/reset state and that setting the prompt persists immediately.
- `bun test` passes.
- `bun run build` passes.
- `bun run lint` passes.
- Manual verification confirms that a sidebar Trash action is always visible, a chat can be restored from Cleanup, Delete All Chats does not remove configuration, Delete Everything remains unchanged, and Revert restores the default prompt.

## Scope of Changes

- `src/stores/chatStore.ts`
- `src/stores/settingsStore.ts`
- `src/components/sidebar/Sidebar.tsx`
- `src/components/cleanup/CleanupPanel.tsx`
- `src/components/settings/SettingsPanel.tsx`
- relevant store tests
