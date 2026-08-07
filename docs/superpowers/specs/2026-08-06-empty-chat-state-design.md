# Configured Empty Chat State

## Context

When no conversation is active, `ChatView` currently always renders the initial setup state with a `Configure your first provider` action. That state is correct when the application has no usable provider configuration, but it is not useful after a provider and model are already active. The existing sidebar already knows how to create a conversation with the active provider, active model, and default system prompt.

## Goals

- Keep the current setup state when no provider and model are active.
- Show a clear start-chatting state when a provider and model are active.
- Let the user create a new conversation directly from the main empty state.
- Reuse the existing conversation creation flow and current settings.
- Avoid changing existing conversations or message sending behavior.

## Non-goals

- No changes to provider or model configuration screens.
- No changes to the sidebar New Chat action.
- No changes to conversation persistence or message rendering.
- A provider without an active model is not considered ready to start a chat.

## Design

`ChatView` will read `activeProviderId`, `activeModelId`, and `defaultSystemPrompt` from the settings store. It will resolve the active provider and model and derive a `canStartConversation` condition that requires both objects to exist.

When `canStartConversation` is false, the current empty state remains unchanged, including the `Configure your first provider` button.

When `canStartConversation` is true, the empty state will render:

- title: `Ready when you are`;
- description: `Start a new conversation with your active model.`;
- primary action: `Start a new chat`.

The primary action will call `createNewConversation(activeProviderId, activeModelId, defaultSystemPrompt)`. This creates and selects the conversation using the same store method as the sidebar. The active provider and model labels do not need to be duplicated in the CTA copy because the sidebar already displays the current selection.

## Data Flow

1. `ChatView` resolves the active provider and model from settings.
2. The empty-state branch selects setup or ready content based on both resolved values.
3. The ready CTA calls `createNewConversation` with the current settings.
4. The chat store persists the new conversation and selects it as active.
5. `ChatView` renders the normal conversation interface for the new active conversation.

The setup CTA continues opening Settings through the existing `setSettingsOpen` action.

## Error Handling and Accessibility

- The ready CTA will only be rendered when both IDs resolve to valid provider and model objects.
- The handler will retain a defensive guard for missing IDs before creating a conversation.
- Both branches will keep a single clear primary button with an accessible text label.
- No asynchronous operations or new error paths are introduced.

## Testing and Acceptance Criteria

- The TypeScript build and lint pass.
- Manual verification with no provider/model shows `Configure your first provider`.
- Manual verification with an active provider and model shows `Ready when you are` and `Start a new chat`.
- Clicking `Start a new chat` creates and selects a conversation with the active provider, model, and default prompt.
- A provider configured without an active model still shows the setup state.
- Existing chat, sidebar, and settings behavior remains unchanged.

## Scope of Changes

- `src/components/chat/ChatView.tsx`
- relevant UI or store tests only if the existing test setup can cover the branch without adding a new test framework
