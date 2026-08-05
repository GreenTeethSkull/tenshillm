# TenshiLLM Manual E2E Runbook

This runbook is the repeatable smoke/integration test for the local Tauri app. It deliberately contains placeholders only. Enter live credentials manually during a test session and never paste them into this file, screenshots, terminal transcripts, or git.

## Preconditions

- Bun and the project dependencies are installed.
- A Tauri desktop runtime is available for provider, MCP, and web-search commands.
- Use an isolated test profile or be prepared to run Cleanup at the end.
- The vision test asset is `docs/testing/greenskull.png`; refer to it as `@greenskull.png` when attaching it in the chat.
- Use the local `.env` file as the source of test data. The application does not load it automatically; copy values into the Settings forms only when a step asks for them.
- Never log full API keys, authorization headers, MCP responses containing secrets, or model request payloads.

## Test Data from `.env`

`.env` contains the local test values and is ignored by Git. `.env.example` documents the required variable names without real credentials. Do not replace `.env` with `.env.example` after real values have been configured.

Use a dotenv-aware loader or shell session to read the variables. Do not paste decoded values into this document, screenshots, or command transcripts. Base64 variables keep multiline Markdown safe inside `.env`.

| Test data | Variables to read from `.env` | Use in the app |
| --- | --- | --- |
| Provider | `TENSILLM_PROVIDER_NAME`, `TENSILLM_PROVIDER_ENDPOINT`, `TENSILLM_PROVIDER_API_KEY` | `Settings > Providers` |
| Model | `TENSILLM_PROVIDER_MODEL_ID`, `TENSILLM_PROVIDER_MODEL_NAME`, `TENSILLM_PROVIDER_TOOLS`, `TENSILLM_PROVIDER_VISION` | Add model with Tools and Vision enabled |
| Context7 MCP | `TENSILLM_CONTEXT7_NAME`, `TENSILLM_CONTEXT7_URL`, `TENSILLM_CONTEXT7_HEADER_NAME`, `TENSILLM_CONTEXT7_API_KEY` | Headers JSON: `{ "<header name>": "<key>" }` |
| Dynatrace MCP | `TENSILLM_DYNATRACE_NAME`, `TENSILLM_DYNATRACE_URL`, `TENSILLM_DYNATRACE_AUTHORIZATION` | Headers JSON: `{ "Authorization": "<authorization>" }` |
| Search | `TENSILLM_SEARCH_PROVIDER`, `TENSILLM_SEARCH_API_KEY`, `TENSILLM_SEARCH_MAX_RESULTS`, `TENSILLM_SEARCH_QUERY` | `Settings > Search`; leave the DuckDuckGo key empty |
| Vision image | `docs/testing/greenskull.png` | Attach as `@greenskull.png` in a vision-enabled chat |
| Hello skill | `TENSILLM_HELLO_WORLD_NAME`, `TENSILLM_HELLO_WORLD_DESCRIPTION`, `TENSILLM_HELLO_WORLD_CONTENT_B64`, `TENSILLM_HELLO_WORLD_QUERY` | Decode content and add under `Settings > Skills` |
| Slugify skill | `TENSILLM_SLUGIFY_NAME`, `TENSILLM_SLUGIFY_DESCRIPTION`, `TENSILLM_SLUGIFY_CONTENT_B64`, `TENSILLM_SLUGIFY_QUERY` | Decode content and add under `Settings > Skills` |
| System prompt | `TENSILLM_SYSTEM_PROMPT_B64`, `TENSILLM_SYSTEM_PROMPT_QUERY` | Decode content and paste into `Default System Prompt` |
| Context7 call | `TENSILLM_CONTEXT7_TOOL`, `TENSILLM_CONTEXT7_ARGUMENTS_JSON` | Use for the safe documentation lookup |
| Dynatrace call | `TENSILLM_DYNATRACE_TOOL`, `TENSILLM_DYNATRACE_ARGUMENTS_JSON` | Use for the safe read-only query |

The provider endpoint may include `/chat/completions`; the app accepts it as-is or accepts a provider base URL.

For a local decode without creating another file, use the value of `TENSILLM_SYSTEM_PROMPT_B64` or a skill `*_CONTENT_B64` variable with `base64 --decode`, then paste the output directly into the corresponding form. Keep the terminal session private.

When recording a run, use only sanitized placeholders:

| Item | Value to enter during the run |
| --- | --- |
| Provider endpoint | `PROVIDER_ENDPOINT` |
| Provider API key | `PROVIDER_API_KEY` |
| Model ID | `minimax-m3` |
| Model name | `MiniMax M3` |
| Context7 URL | `https://mcp.context7.com/mcp` |
| Dynatrace URL | `DYNATRACE_MCP_URL` |
| Search provider | `DuckDuckGo` |
| Search API key | Leave empty |
| URL search target | `https://opencode.ai/docs/agents/` |

The real MCP headers are entered manually in the JSON field. Record only `configured`, `connected`, `tool count`, and `passed/failed`.

## Ordered Test

### 1. Fresh settings and Search default

1. Launch the Tauri app.
2. Open `Settings` and select `Search`.
3. Verify `Provider` is `DuckDuckGo (No key)` on a fresh profile.
4. Verify `API Key` is not displayed for DuckDuckGo.
5. Verify the `Enable web search` switch has an accessible label and can be toggled with keyboard focus.

Expected: DuckDuckGo is selected, no key is required, and the switch changes state without a console error.

### 2. Search switch persistence

1. Toggle `Enable web search` on.
2. Close and reopen Settings.
3. Reload the app.
4. Return to `Settings > Search`.

Expected: the switch remains enabled and DuckDuckGo remains selected. In DevTools, `localStorage.tenshillm-settings` must contain `searchConfig.enabled: true` and `searchConfig.provider: "duckduckgo"`; do not export or screenshot the full object if it contains credentials.

### 3. Provider and model

1. Open `Settings > Providers`.
2. Add `TENSILLM_PROVIDER_ENDPOINT` with `TENSILLM_PROVIDER_API_KEY`.
3. Add the model and flags from `TENSILLM_PROVIDER_MODEL_ID`, `TENSILLM_PROVIDER_MODEL_NAME`, `TENSILLM_PROVIDER_TOOLS`, and `TENSILLM_PROVIDER_VISION`.
4. Select the provider and model in the sidebar.
5. Use the provider connection test if available.

Expected: the provider/model can be selected and the connection test succeeds. A failure must include only the HTTP status/category in the test record.

### 4. Remote MCP servers

1. Open `Settings > MCP`.
2. Add the Context7 server using `TENSILLM_CONTEXT7_NAME`, `TENSILLM_CONTEXT7_URL`, `TENSILLM_CONTEXT7_HEADER_NAME`, and `TENSILLM_CONTEXT7_API_KEY`.
3. Add the Dynatrace server using `TENSILLM_DYNATRACE_NAME`, `TENSILLM_DYNATRACE_URL`, and `TENSILLM_DYNATRACE_AUTHORIZATION`.
4. Connect each server.
5. Verify the tool list is populated.
6. In separate chats, ask the model for one safe Context7 documentation lookup and one safe Dynatrace documentation/query operation.

Expected: both servers initialize, tools are exposed to the model, and the model returns a tool result. If an MCP server rejects the protocol version or requires a different safe operation, record the sanitized error and continue with the remaining checks.

### 5. Agent skills

Add and enable these two skills using the decoded `.env` variables:

- `TENSILLM_HELLO_WORLD_NAME`: invoke with `TENSILLM_HELLO_WORLD_QUERY`; expected exact response: `Skill hello-world invoked successfully. ✅`
- `TENSILLM_SLUGIFY_NAME`: invoke with `TENSILLM_SLUGIFY_QUERY`; expected exact response: `hola-mundo-como-estas`

Expected: the skill instructions are included in the request context and the output follows each skill's exact-output requirement.

If the model sends reasoning inside `<think>...</think>` in the normal content field, the client should move it into the collapsible Thinking section and keep only the final answer visible.

### 6. System prompt

Decode `TENSILLM_SYSTEM_PROMPT_B64` into the default system prompt. Start a new chat and ask `TENSILLM_SYSTEM_PROMPT_QUERY`.

Expected: the response recognizes the supplied professional context and follows the requested professional, technical, direct tone. Do not use this step to reveal credentials.

### 7. DuckDuckGo web search

With `TENSILLM_SEARCH_PROVIDER` enabled, `TENSILLM_SEARCH_API_KEY` empty, and the configured max results, ask the question using the value stored in `TENSILLM_SEARCH_QUERY`:

> Busca información actual sobre `<valor de TENSILLM_SEARCH_QUERY>` y resume qué es un Agent.

Expected:

- The model emits a `web_search` tool call.
- The Tauri backend calls DuckDuckGo without an API key.
- The model produces a useful answer or a clearly reported provider limitation.
- DevTools shows no frontend exception.

Note: the app uses DuckDuckGo's HTML results endpoint because the public Instant Answer endpoint does not reliably return web results for arbitrary pages. If DuckDuckGo returns an anti-bot challenge, record the observed HTTP status/category and do not silently fall back to another search engine.

### 8. Vision and image upload

1. Confirm the selected model has `Vision` enabled in `Settings > Providers`.
2. Start a new chat and attach `docs/testing/greenskull.png` (`@greenskull.png`).
3. Ask exactly: `Describe esta imagen en una frase.`
4. Verify the image preview is visible before sending.
5. Verify the sent user message retains the image and the model returns a description of the visible green skull.

Expected:

- The image file is accepted and appears in the composer preview.
- The request contains a multimodal user content array with the text and a PNG data URL.
- The model reads the image instead of reporting that no image was provided.
- DevTools and the provider response show no `invalid image detail: auto` error.

### 9. Chats and persistence

1. Create at least two chats.
2. Send a distinct short message in each.
3. Switch chats and verify message isolation.
4. Reload the app and verify both conversations remain.

Expected: titles, active selection, and messages persist without cross-chat leakage.

### 10. Cleanup

1. Open `Cleanup`.
2. Verify active chat and message counts.
3. Confirm `Delete Everything` by clicking it twice.
4. Verify conversations and messages are removed.
5. Reopen the app and confirm no old chats remain, providers/MCP/skills are reset, and the theme returns to the default.

Expected: cleanup is two-step, counts update, the persisted chat and settings stores are empty, and the app defaults are restored. Do not delete unrelated local application data outside the app.

### 11. UI and diagnostics

- Run at desktop width and a narrow mobile-sized viewport.
- Check keyboard focus, Escape/backdrop close behavior, and no horizontal overflow.
- Inspect browser console for uncaught exceptions.
- Inspect failed network requests, excluding redacted credential values.
- Capture screenshots only after confirming no secrets are visible.

### 12. Close the local runtime

After all tests, close the Tauri window and stop the development process that listens on port `1420`.

1. Identify the listener created for this test run:

   ```bash
   lsof -nP -iTCP:1420 -sTCP:LISTEN
   ```

2. Stop its PID, then verify that no process remains on the port:

   ```bash
   PIDS=$(lsof -tiTCP:1420 -sTCP:LISTEN)
   if [ -n "$PIDS" ]; then kill $PIDS; fi
   lsof -nP -iTCP:1420 -sTCP:LISTEN
   ```

Expected: the final command returns no listener for port `1420`. Do not kill an unrelated process; if the PID is not the process started for this run, stop and record the exception instead.

## Result Template

```text
Run date:
Build commit:
Runtime: Tauri desktop/mobile or browser-only

Search default: PASS/FAIL
Search switch persistence: PASS/FAIL
Provider/model: PASS/FAIL
Context7 MCP: PASS/FAIL (tools: N)
Dynatrace MCP: PASS/FAIL (tools: N)
hello-world skill: PASS/FAIL
slugify skill: PASS/FAIL
System prompt: PASS/FAIL
DuckDuckGo search: PASS/FAIL (HTTP/category only)
Vision/image upload with greenskull.png: PASS/FAIL
Chat creation/persistence: PASS/FAIL
Cleanup: PASS/FAIL
Responsive/accessibility/console: PASS/FAIL
Port 1420 closed after testing: PASS/FAIL

Notes:
```

After testing, rotate the credentials shared for the session if they are still active.
