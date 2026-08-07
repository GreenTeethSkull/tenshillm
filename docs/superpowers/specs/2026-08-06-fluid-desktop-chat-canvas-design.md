# Fluid Desktop Chat Canvas

## Context

The chat interface is intentionally mobile-first, but both the message rail and the composer are currently constrained by `max-w-3xl`. On desktop this leaves large unused margins inside the main content area, even when the available viewport is wide enough for more content.

## Goals

- Use the available desktop width more effectively for messages and the composer.
- Keep the sidebar, header, message behavior, and visual language unchanged.
- Preserve the current mobile and tablet experience.
- Keep user bubbles visually bounded while allowing assistant content, code, and tool results to use the wider rail.
- Keep the message list and composer aligned to the same responsive rail.

## Non-goals

- No changes to conversation state, persistence, streaming, or message rendering logic.
- No sidebar redesign or width changes.
- No change to the user bubble percentage limits.
- No new layout state or user preference for switching widths.

## Design

### Message rail

In `ChatView.tsx`, the message wrapper will replace `max-w-3xl mx-auto` with a full-width responsive container. It will retain the existing mobile and tablet padding and add larger desktop padding at `lg` and `xl` breakpoints. The container will use all available width between the sidebar and viewport edges while maintaining comfortable gutters.

### Composer rail

In `MessageInput.tsx`, the composer wrapper will use the same responsive width and padding classes as the message wrapper. This keeps the textarea, attachment preview, send controls, and shortcut hint aligned with the message content above it.

### Message proportions

The existing `MessageBubble` rules remain unchanged. User messages will continue to use their current `85%` mobile and `75%` larger-screen limits. Assistant messages, Markdown, code blocks, and tool results will be able to occupy the wider parent rail.

## Responsive Behavior

- Mobile: preserve the current `px-4` spacing and full available width.
- Tablet: preserve the current `md:px-6` spacing.
- Large desktop: use full width with increased gutters such as `lg:px-10` and `xl:px-16`.
- No fixed maximum width will be introduced for the desktop rail, so wide windows can use the space available after the sidebar.

## Data Flow and Accessibility

This is a CSS-only layout change. It does not affect state, event handlers, focus order, keyboard behavior, labels, or persisted data. Existing overflow handling for Markdown, code, and tool results remains responsible for long content.

## Testing and Acceptance Criteria

- `bun test` passes.
- `bun run build` passes.
- `bun run lint` passes.
- At desktop width, the message rail and composer visibly use more horizontal space and share the same left and right edges.
- At mobile width, the existing spacing and controls remain usable without horizontal overflow.
- User message bubbles remain bounded rather than stretching across the full canvas.
- No console errors appear during manual desktop and mobile checks.

## Scope of Changes

- `src/components/chat/ChatView.tsx`
- `src/components/chat/MessageInput.tsx`
