# Search Defaults and End-to-End Testing Design

## Goal

Make DuckDuckGo the default web-search provider, verify the Search settings switch and persistence, and document a repeatable manual E2E sequence for the provider, MCP, skills, system prompt, chat, and cleanup flows.

## Scope

- Change the initial `SearchConfig.provider` from Tavily to DuckDuckGo.
- Preserve DuckDuckGo's no-API-key behavior.
- Use DuckDuckGo's web-results endpoint rather than treating an empty Instant Answer response as a successful search.
- Ensure Search settings save the newly selected value rather than a stale Zustand snapshot.
- Add a sanitized manual test runbook under `docs/testing/manual-e2e.md`.
- Validate the application with the supplied live configuration during this session only.

## Security Constraints

- Never write the supplied API keys, MCP headers, or bearer tokens to source, documentation, logs, screenshots, or git history.
- Use live credentials only as runtime test input.
- Record only sanitized outcomes and endpoint names.
- Recommend credential rotation after testing because the values were shared in chat.

## Implementation

The Search panel will retain its current controls and visual language. The settings store will use DuckDuckGo in `DEFAULT_SEARCH_CONFIG`. Settings mutations that immediately persist will pass the new configuration to a persistence-safe update path, preventing `saveSettings()` from reading the previous render/store value.

The runtime search guard will continue to allow an enabled DuckDuckGo configuration with an empty API key and require a key for providers that need one.

## Test Sequence

The runbook will define these ordered checks:

1. Start the app with a clean or isolated localStorage profile.
2. Verify `Settings > Search` renders DuckDuckGo by default and the enable switch is keyboard/focus accessible.
3. Enable search, reload, and verify the enabled state and provider persist.
4. Configure the supplied OpenAI-compatible provider and `minimax-m3`, then verify the connection/model selection.
5. Configure and connect the Context7 and Dynatrace remote MCP servers; verify tool discovery and one safe tool invocation per server where available.
6. Configure and enable the `hello-world` and `slugify` skills; verify explicit invocation and exact slug output.
7. Configure the supplied system prompt and verify the model responds consistently with the user context.
8. Ask for a current result involving `https://opencode.ai/docs/agents/`; verify the model invokes DuckDuckGo and returns a useful result.
9. Create multiple chats, switch between them, and verify message/conversation persistence.
10. Open Cleanup, verify counts, delete all data, and confirm conversations/settings are cleared as expected.
11. Check desktop/mobile-safe error behavior, console errors, responsive layout, and reload persistence.

## Acceptance Criteria

- New installations select DuckDuckGo without an API key.
- Enabling Search persists after reload and makes the `web_search` tool eligible for tool-capable models.
- A configured DuckDuckGo search completes without an API key in the Tauri runtime.
- MCP, skills, system prompt, chat creation, and Cleanup flows have explicit pass/fail results in the runbook.
- No secret appears in tracked files, test artifacts, screenshots, or logs.
- Frontend build/type checks pass; Rust checks pass where the local toolchain permits them.
