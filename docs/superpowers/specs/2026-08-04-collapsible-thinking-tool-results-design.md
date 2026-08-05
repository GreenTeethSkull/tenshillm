# Collapsible Thinking and Tool Results Design

## Goal

Keep the chat focused on the model's final answer while preserving access to
reasoning and tool output when the user explicitly expands those sections.

## Scope

- Extract only an initially positioned, closed `<think>...</think>` block from
  normal assistant content.
- Leave an initial unclosed block visible until its closing tag arrives.
- Leave `<think>` tags that occur after other response content untouched.
- Store provider reasoning separately from the final assistant content.
- Render reasoning and tool results in native, collapsed `<details>` elements.
- Verify the behavior with unit tests, the frontend build, and the manual E2E
  runbook using both `minimax-m3` and `gpt-5.6-luna`.

## Behavior

`normalizeInlineThinking` will match only a pattern anchored at the beginning
of the content, allowing leading whitespace, and requiring a closing tag. The
match is removed from `content` and appended to `reasoning`. If the pattern
does not match, the original content remains intact and only provider-supplied
`reasoning_content` is normalized.

This means a stream such as `<think>working` remains visible as normal content
until `</think>` arrives. A later `<think>example</think>` in an answer is not
interpreted as hidden reasoning because it is not at the beginning.

## Implementation

- Add optional `reasoning?: string` to `Message` so persisted messages remain
  compatible with older records.
- Update the completion stream flow to persist normalized `content` and
  `reasoning` independently instead of injecting `<details>` markup into the
  message content.
- Render `reasoning` with a native `<details>` element whose summary is
  `Thinking`; it is closed by default and contains the existing Markdown
  renderer when expanded.
- Render tool messages with a native `<details>` element whose summary is
  `Tool Result`; the complete result remains in the existing `<pre>` block and
  errors are indicated in the summary without hiding their content permanently.
- Keep the clean assistant `content` in subsequent OpenAI-compatible payloads;
  reasoning remains presentation/history metadata and is not sent as an extra
  message field.

## Compatibility and Error Handling

- Existing messages without `reasoning` continue to render normally.
- A malformed or incomplete initial thinking tag is not stripped.
- Tags outside the supported initial paired block are treated as ordinary
  model output and are not interpreted by the client.
- Tool failures remain visible after expanding `Tool Result` and continue to
  use the existing `isError` state.

## Verification

- Unit tests cover an initial paired block, an initial unclosed block, a later
  block, leading whitespace, and provider `reasoning_content`.
- `bun run test` and `bun run build` must pass.
- The documented manual E2E sequence must be run with `minimax-m3` and then
  `gpt-5.6-luna`, recording only sanitized pass/fail outcomes.
- Manual UI checks must confirm both sections start collapsed, expand fully,
  remain usable on desktop and narrow mobile layouts, and produce no console
  exceptions.

## Acceptance Criteria

- No generated `<details>` markup is stored inside the final assistant answer.
- Only an initial paired `<think>` block is moved to collapsed Thinking.
- Initial incomplete and later `<think>` blocks are not extracted.
- Tool results are collapsed by default and expandable in full.
- Existing chat persistence remains readable.
- Both requested models complete the relevant manual E2E checks without secrets
  appearing in source, documentation, screenshots, or logs.
