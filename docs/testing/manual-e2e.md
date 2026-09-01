# TenshiLLM Manual E2E Runbook

This runbook is the repeatable smoke/integration test for the local Tauri app. It deliberately contains placeholders only. Enter live credentials manually during a test session and never paste them into this file, screenshots, terminal transcripts, or git.

## Preconditions

- Bun and the project dependencies are installed.
- A Tauri desktop runtime is available for provider, MCP, and web-search commands.
- Remote-skill installation (section 6) needs the Tauri runtime for `skills.sh` directory search; the GitHub-backed install/update flows can also run browser-only using the shim in Appendix A because the GitHub API and raw content endpoints send CORS headers.
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

### 6. Remote skills installation (skills.sh ecosystem)

Public sources — no credentials required. The install, update, and uninstall flows exercise the Rust commands `skills_resolve_source`, `skills_fetch_skill`, and `skills_check_updates`.

| Item | Value |
| --- | --- |
| Single-skill tree URL | `https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd` |
| Multi-skill repo shorthand | `vercel-labs/agent-skills` |
| Direct SKILL.md URL | `https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/tdd/SKILL.md` |
| skills.sh query | `tdd` |

1. Open `Settings > Skills`.
2. Enter the single-skill tree URL in `Install from source` and select `Find`.
   Expected: one candidate is listed, named after the skill folder, with its frontmatter description.
3. Install it.
   Expected: a success toast and a card with a `mattpocock/skills` source badge, enabled by default.
4. Enter the multi-skill repo shorthand and select `Find`.
   Expected: more than one candidate is listed (names come from each `SKILL.md` frontmatter).
5. Select two of them and install.
   Expected: two additional cards appear with the repo badge.
6. Run the single-skill tree URL again (`Find` + `Install`).
   Expected: no duplicate card; the toast reports the existing skill as updated (upsert by source kind + repo + path).
7. Install the direct SKILL.md URL.
   Expected: a separate card is created for the URL-sourced copy (different provenance is a distinct entry) and no console error appears.
8. Select `Check updates`.
   Expected: every remote skill reports up to date, no duplicate cards are created, and the toast summarizes the counts.
9. Use one remote skill's per-card update button.
   Expected: a success toast and unchanged card count.
10. Delete one remote skill card.
    Expected: the card is removed.
11. In `Browse skills.sh`, search for the skills.sh query.
    Expected (Tauri runtime): results list names, `owner/repo` sources, and install counts; installing one adds its card. Expected (browser-only): the Appendix A fixture list renders; record the live endpoint as `SKIPPED (no CORS)`.
12. Reload the app and reopen `Settings > Skills`.
    Expected: the installed remote skills persist; `localStorage.tenshillm-settings` contains `agentSkills[]` entries with `source` objects (do not export or screenshot other keys that may contain credentials).
13. Add one manual skill through the `Add` form.
    Expected: the manual card shows no source badge and no update button.

### 7. System prompt

Decode `TENSILLM_SYSTEM_PROMPT_B64` into the default system prompt. Start a new chat and ask `TENSILLM_SYSTEM_PROMPT_QUERY`.

Expected: the response recognizes the supplied professional context and follows the requested professional, technical, direct tone. Do not use this step to reveal credentials.

### 8. DuckDuckGo web search

With `TENSILLM_SEARCH_PROVIDER` enabled, `TENSILLM_SEARCH_API_KEY` empty, and the configured max results, ask the question using the value stored in `TENSILLM_SEARCH_QUERY`:

> Busca información actual sobre `<valor de TENSILLM_SEARCH_QUERY>` y resume qué es un Agent.

Expected:

- The model emits a `web_search` tool call.
- The Tauri backend calls DuckDuckGo without an API key.
- The model produces a useful answer or a clearly reported provider limitation.
- DevTools shows no frontend exception.

Note: the app uses DuckDuckGo's HTML results endpoint because the public Instant Answer endpoint does not reliably return web results for arbitrary pages. If DuckDuckGo returns an anti-bot challenge, record the observed HTTP status/category and do not silently fall back to another search engine.

### 9. Vision and image upload

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

### 10. Chats and persistence

1. Create at least two chats.
2. Send a distinct short message in each.
3. Switch chats and verify message isolation.
4. Reload the app and verify both conversations remain.

Expected: titles, active selection, and messages persist without cross-chat leakage.

### 11. Cleanup

1. Open `Cleanup`.
2. Verify active chat and message counts.
3. Confirm `Delete Everything` by clicking it twice.
4. Verify conversations and messages are removed.
5. Reopen the app and confirm no old chats remain, providers/MCP/skills are reset, and the theme returns to the default.

Expected: cleanup is two-step, counts update, the persisted chat and settings stores are empty, and the app defaults are restored. Do not delete unrelated local application data outside the app.

### 12. UI and diagnostics

- Run at desktop width and a narrow mobile-sized viewport.
- Check keyboard focus, Escape/backdrop close behavior, and no horizontal overflow.
- Inspect browser console for uncaught exceptions.
- Inspect failed network requests, excluding redacted credential values.
- Capture screenshots only after confirming no secrets are visible.

### 13. Close the local runtime

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
Remote skills install (tree URL): PASS/FAIL (N installed)
Remote skills install (multi repo): PASS/FAIL (N installed)
Remote skills upsert (same source re-install): PASS/FAIL
Remote skills install (direct SKILL.md URL): PASS/FAIL
Remote skills check updates: PASS/FAIL
Remote skills per-card update: PASS/FAIL
Remote skills uninstall: PASS/FAIL
skills.sh directory search: PASS/FAIL / SKIPPED (no CORS, browser-only)
Remote skills persistence after reload: PASS/FAIL
Manual skill has no badge/update: PASS/FAIL
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

## Appendix A — Browser-only mode for remote-skill flows

Section 6 can run without the Tauri desktop runtime by pasting the shim below into the browser DevTools console after the app loads (or injecting it before scripts). It fakes `window.__TAURI_INTERNALS__` so `isTauriRuntime()` passes and `invoke()` is routed to the shim:

- `skills_resolve_source`, `skills_fetch_skill`, and `skills_check_updates` perform **real network calls** against the GitHub API and `raw.githubusercontent.com` (both send `Access-Control-Allow-Origin: *`), so the frontend wiring, data shapes, and UI flows are exercised end to end. The Rust implementations of these commands are covered separately by `bun run test:rust`.
- `skills_search_directory` returns a fixture because `skills.sh` does not send CORS headers; the live endpoint is only reachable from the Tauri runtime. Record that step as `SKIPPED (no CORS, browser-only)` unless running in Tauri.
- Any other command (providers, MCP, dialogs) throws from the shim on purpose — do not use this mode to test those sections.

```js
(function installTauriSkillsShim() {
  const SKILL_FILE = 'SKILL.md';
  const last = (items) => items[items.length - 1];

  function parseSource(raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('Skill source cannot be empty');
    if (/^https?:\/\//.test(value)) {
      const trimmed = value.replace(/\/+$/, '');
      const match = trimmed.match(/^https?:\/\/([^/]+)\/(.*)$/);
      if (!match) throw new Error('Malformed skill source URL');
      const host = match[1].toLowerCase();
      const path = match[2];
      if (host === 'github.com') {
        const [owner, repo, kind, ref, ...rest] = path.split('/');
        if (!owner || !repo) throw new Error('Unsupported GitHub URL');
        const source = { kind: 'github', repo: owner + '/' + repo };
        if (kind === 'tree' || kind === 'blob') {
          if (!ref) throw new Error('GitHub URL is missing a ref');
          const skillPath = rest.join('/');
          if (kind === 'blob' && !skillPath.endsWith(SKILL_FILE)) throw new Error('Not a SKILL.md blob');
          source.reference = ref;
          if (skillPath) source.skillPath = skillPath;
        } else if (kind) throw new Error('Unsupported GitHub URL');
        return source;
      }
      if (host === 'gitlab.com') {
        const index = path.indexOf('/-/');
        if (index === -1) return { kind: 'gitlab', repo: path };
        const [kind, ref, ...rest] = path.slice(index + 3).split('/');
        const skillPath = rest.join('/');
        if (kind !== 'tree' && kind !== 'blob') throw new Error('Unsupported GitLab URL');
        if (!ref) throw new Error('GitLab URL is missing a ref');
        if (kind === 'blob' && !skillPath.endsWith(SKILL_FILE)) throw new Error('Not a SKILL.md blob');
        const source = { kind: 'gitlab', repo: path.slice(0, index), reference: ref };
        if (skillPath) source.skillPath = skillPath;
        return source;
      }
      if (trimmed.endsWith(SKILL_FILE)) return { kind: 'url', url: trimmed };
      throw new Error('URL must point to a GitHub/GitLab repository or a SKILL.md file');
    }
    const segments = value.split('/');
    if (segments.length === 2 && segments.every((part) => part && !/\s/.test(part))) {
      return { kind: 'github', repo: value };
    }
    throw new Error('Unsupported skill source: ' + value);
  }

  function splitSkillMarkdown(raw) {
    const normalized = String(raw).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    if (lines[0] !== '---') return { name: null, description: null, content: normalized };
    let name = null;
    let description = null;
    let closed = false;
    let index = 1;
    for (; index < lines.length; index++) {
      const line = lines[index];
      if (line.trimEnd() === '---') { closed = true; index++; break; }
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim().toLowerCase();
      let value = line.slice(colon + 1).trim();
      if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
        value = value.slice(1, -1).trim();
      }
      if (value.startsWith('>') || value.startsWith('|')) continue;
      if (key === 'name') name = value;
      else if (key === 'description') description = value;
    }
    if (!closed) return { name: null, description: null, content: normalized };
    return { name, description, content: lines.slice(index).join('\n').trim() };
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Request failed (' + response.status + ') for ' + url);
    const text = await response.text();
    if (text.length > 256 * 1024) throw new Error('Skill exceeded the 256 KiB limit');
    return text;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Request failed (' + response.status + ') for ' + url);
    return response.json();
  }

  function inferName(skillPath, repo) {
    const segments = skillPath.split('/').filter((part) => part && part !== SKILL_FILE);
    if (segments.length) return segments[segments.length - 1];
    return repo ? last(repo.split('/')) : 'skill';
  }

  function rawUrl(source, branch, skillPath) {
    if (source.kind === 'github') {
      return 'https://raw.githubusercontent.com/' + source.repo + '/' + branch + '/' + skillPath;
    }
    return 'https://gitlab.com/' + source.repo + '/-/raw/' + branch + '/' + skillPath;
  }

  async function resolveBranch(source) {
    if (source.reference) return source.reference;
    if (source.kind === 'github') {
      const info = await fetchJson('https://api.github.com/repos/' + source.repo);
      if (!info.default_branch) throw new Error('No default branch reported');
      return info.default_branch;
    }
    const info = await fetchJson('https://gitlab.com/api/v4/projects/' + encodeURIComponent(source.repo));
    if (!info.default_branch) throw new Error('No default branch reported');
    return info.default_branch;
  }

  function listingFromRaw(raw, skillPath, repo) {
    const parsed = splitSkillMarkdown(raw);
    return {
      name: parsed.name || inferName(skillPath, repo),
      description: parsed.description || '',
      skillPath,
    };
  }

  function urlFallbackName(url) {
    return last(url.replace(/\/+$/, '').slice(0, -SKILL_FILE.length).split('/')) || 'skill';
  }

  async function resolveSource(source) {
    if (source.kind === 'url') {
      const parsed = splitSkillMarkdown(await fetchText(source.url));
      return {
        source,
        skills: [{ name: parsed.name || urlFallbackName(source.url), description: parsed.description || '', skillPath: source.url }],
      };
    }
    const prefix = source.skillPath ? source.skillPath.replace(/^\/+|\/+$/g, '') : null;
    if (prefix && prefix.endsWith(SKILL_FILE)) {
      const raw = await fetchText(rawUrl(source, await resolveBranch(source), prefix));
      return { source, skills: [listingFromRaw(raw, prefix, source.repo)] };
    }
    const branch = await resolveBranch(source);
    let paths = [];
    if (source.kind === 'github') {
      const tree = await fetchJson('https://api.github.com/repos/' + source.repo + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1');
      if (tree.truncated) throw new Error('Repository tree is too large to list');
      paths = (tree.tree || [])
        .filter((entry) => entry.type === 'blob' && last(entry.path.split('/')) === SKILL_FILE)
        .map((entry) => entry.path);
    } else {
      let page = 1;
      for (;;) {
        const response = await fetch('https://gitlab.com/api/v4/projects/' + encodeURIComponent(source.repo) + '/repository/tree?recursive=true&per_page=100&page=' + page + '&ref=' + encodeURIComponent(branch) + (prefix ? '&path=' + encodeURIComponent(prefix) : ''));
        if (!response.ok) throw new Error('GitLab tree failed (' + response.status + ')');
        const items = await response.json();
        for (const entry of Array.isArray(items) ? items : []) {
          if (entry.type === 'blob' && last(entry.path.split('/')) === SKILL_FILE) paths.push(entry.path);
        }
        const next = Number(response.headers.get('X-Next-Page'));
        if (!next || next <= page || page >= 10) break;
        page = next;
      }
    }
    if (prefix) paths = paths.filter((path) => path === prefix || path.startsWith(prefix + '/'));
    if (!paths.length) throw new Error('No SKILL.md files found at that source');
    paths.sort();
    const skills = [];
    for (const skillPath of paths) {
      skills.push(listingFromRaw(await fetchText(rawUrl(source, branch, skillPath)), skillPath, source.repo));
    }
    return { source, skills };
  }

  async function fetchSkill(source) {
    if (source.kind === 'url') {
      const parsed = splitSkillMarkdown(await fetchText(source.url));
      return { name: parsed.name || urlFallbackName(source.url), description: parsed.description || '', content: parsed.content, source };
    }
    if (!source.skillPath || !source.skillPath.endsWith(SKILL_FILE)) {
      throw new Error('Skill source is missing a SKILL.md path');
    }
    const parsed = splitSkillMarkdown(await fetchText(rawUrl(source, await resolveBranch(source), source.skillPath)));
    return {
      name: parsed.name || inferName(source.skillPath, source.repo),
      description: parsed.description || '',
      content: parsed.content,
      source,
    };
  }

  const DIRECTORY_FIXTURE = [
    { id: 'mattpocock/skills/tdd', name: 'tdd', installs: 783244, source: 'mattpocock/skills' },
    { id: 'affaan-m/ecc/tdd-workflow', name: 'tdd-workflow', installs: 10145, source: 'affaan-m/ecc' },
    { id: 'vinvcn/mattpock-skills-zh-cn/tdd', name: 'tdd', installs: 4531, source: 'vinvcn/mattpock-skills-zh-cn' },
  ];

  window.__TAURI_INTERNALS__ = {
    invoke: async (command, args) => {
      if (command === 'skills_resolve_source') return resolveSource(parseSource(args && args.source));
      if (command === 'skills_fetch_skill') return fetchSkill(args && args.source);
      if (command === 'skills_check_updates') {
        return Promise.all((args.sources || []).map(async (source, index) => {
          try {
            const content = await fetchSkill(source);
            return { index, name: content.name, description: content.description, content: content.content };
          } catch (error) {
            return { index, name: '', description: '', content: '', error: String((error && error.message) || error) };
          }
        }));
      }
      if (command === 'skills_search_directory') return DIRECTORY_FIXTURE;
      throw new Error('Browser shim does not implement command: ' + command);
    },
  };
  console.info('[e2e] Tauri skills shim installed (GitHub-backed commands hit the real network).');
})();
```
