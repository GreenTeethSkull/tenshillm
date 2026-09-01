# AGENTS.md — TenshiLLM Agent Context

## Project Overview

**TenshiLLM** is a mobile-first AI chat client built with Tauri v2 + React + TypeScript + Bun. It allows users to interact with any OpenAI-compatible LLM API through a beautiful, themeable interface.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Tauri | v2.x |
| Frontend | React | 19.1+ |
| UI Library | HeroUI | v3.2.2 (React Aria + Tailwind v4, no provider) |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | v4.3 |
| State | Zustand | 5.x |
| Bundler | Vite | 7.x |
| Package Manager | Bun | 1.3+ |
| Backend | Rust | 1.96+ |

## Architecture

### Frontend (React + TypeScript)

```
src/
├── main.tsx                  # Entry point, renders App
├── App.tsx                   # Root component, theme application + Toaster
├── types/index.ts            # All TypeScript interfaces + THEMES array
├── styles/globals.css        # Tailwind + HeroUI styles + 6 themes + token bridge
├── stores/                   # Zustand state management
│   ├── themeStore.ts         # Theme selection persistence
│   ├── settingsStore.ts      # Providers, MCP, skills, search config
│   └── chatStore.ts          # Conversations, messages, UI state
├── lib/
│   ├── openai.ts             # OpenAI payload builder, endpoint helper + stream parser
│   ├── skills.ts             # Remote skill resolve/fetch/update/search wrappers (invoke)
│   └── utils.ts              # Lightweight `cn()` className joiner (no tailwind-merge)
└── components/
    ├── Overlay.tsx           # Custom Drawer (right slide-over) + Modal (centered), Escape-handled
    ├── primitives.tsx        # Themed Toggle/TextInput/TextAreaInput/SelectInput/RangeInput/CheckBox/Field/Buttons
    ├── sidebar/Sidebar.tsx   # Conversation list + navigation (HeroUI ScrollShadow + Tooltip)
    ├── chat/
    │   ├── ChatView.tsx      # Main chat interface + streaming logic
    │   ├── MessageBubble.tsx # Message rendering with Markdown (HeroUI Tooltip)
    │   └── MessageInput.tsx  # Input with image upload support
    ├── settings/SettingsPanel.tsx  # Drawer + HeroUI Tabs (Providers/Themes/MCP/Search/Skills)
    └── cleanup/CleanupPanel.tsx    # Modal with stats + cleanup actions
```

> **Note:** There is no `components/ui/` folder. The previous shadcn/ui primitives were
> removed entirely. Reusable primitives now live in `components/primitives.tsx` (custom,
> themed, zero-dependency) and overlays in `components/Overlay.tsx`.

### Backend (Rust + Tauri)

```
src-tauri/
├── Cargo.toml                # Rust dependencies
├── tauri.conf.json           # Tauri app configuration
├── capabilities/default.json # Plugin permissions + HTTP scope
└── src/
    ├── main.rs               # Rust entry point
    ├── skills.rs             # Remote skills: source parser, SKILL.md frontmatter
    │                         #   parser, GitHub/GitLab discovery + raw fetch,
    │                         #   skills.sh directory search + tests
    └── lib.rs                # Tauri commands:
                              #   - send_chat_request
                              #   - test_provider_connection
                              #   - mcp_list_tools
                              #   - mcp_call_tool
                              #   - web_search
                              #   - skills_resolve_source
                              #   - skills_fetch_skill
                              #   - skills_check_updates
                              #   - skills_search_directory
```

## Key Design Decisions

### 1. Tauri HTTP Plugin for API Calls
- **Why**: Browser `fetch` has CORS restrictions in Tauri WebView
- **How**: Use `fetch` from `@tauri-apps/plugin-http` instead of native `fetch`
- **Scope**: Configured in `capabilities/default.json` to allow `https://**` and `http://**`

### 2. Reasoning Model Support
- Models like `mimo-v2.5-pro` return `reasoning_content` alongside `content`
- The streaming parser handles both fields
- If only `reasoning_content` is present, it becomes the displayed response
- Inline `<think>...</think>` blocks are moved into the collapsible Thinking section

### 2.1 Provider Endpoint Compatibility
- Provider URLs may be entered as a base URL or as a complete `/chat/completions` endpoint
- Frontend and Rust backend normalize the URL without duplicating the completion path

### 2.2 DuckDuckGo Search
- DuckDuckGo is the default provider and does not require an API key
- The Rust backend uses DuckDuckGo's HTML results endpoint and normalizes title, URL, and snippet fields
- Anti-bot responses fail explicitly instead of being treated as empty successful results

### 2.3 Remote Skills (skills.sh ecosystem)
- Skills can be installed remotely from the open agent skills ecosystem (`npx skills`-compatible sources) **without Node**: the registry is GitHub/GitLab and the package format is a `SKILL.md` with optional flat YAML frontmatter (`name`, `description`)
- All network work happens in Rust (`src-tauri/src/skills.rs`) via reqwest — HTTP only, so it works on desktop, Android, and iOS (no `tauri-plugin-shell`, no `npx`)
- Accepted sources: `owner/repo` shorthand, GitHub/GitLab URLs (`/tree/<ref>[/<path>]`, `/blob/<ref>/<path>/SKILL.md`), and any direct `SKILL.md` URL
- Discovery uses one GitHub trees API call per repo (`recursive=1`, blobs ending in `SKILL.md`); content is fetched from `raw.githubusercontent.com` (or GitLab raw). Frontmatter parsing is hand-rolled — no YAML crate
- `skills.sh/api/search` is the same undocumented-but-unauthenticated endpoint the official CLI uses; treat it as experimental (graceful empty result on shape drift, explicit error on HTTP failure). It does not send CORS headers, so it is unreachable outside the Tauri runtime
- Installed skills carry an optional `source` (`SkillSource`) on `AgentSkill`; reinstalling the same kind+repo+path **upserts** instead of duplicating; `skills_check_updates` re-fetches and the frontend compares content. Skills without `source` are manual and show no badge/update controls
- Content is capped at 256 KiB; empty-content downloads are rejected by the UI

### 3. MCP Remote Only
- Mobile platforms (Android/iOS) can't spawn local processes reliably
- Only Streamable HTTP transport is supported
- STDIO transport is excluded for mobile compatibility

### 4. localStorage for Persistence
- All settings, conversations, and messages stored in localStorage
- Keys prefixed with `tenshillm-` (e.g., `tenshillm-settings`, `tenshillm-theme`)
- No cloud storage — 100% local

### 5. HeroUI v3 + Custom Token Bridge
- **Why**: shadcn/ui was removed; HeroUI v3 is built on React Aria + Tailwind v4 and requires React 19+ (both already present). HeroUI v3 components do **not** require a provider.
- **How**: HeroUI components consume their own CSS tokens (`--accent`, `--muted`, `--surface`, `--overlay`, `--danger`, `--field-*`, …). A single `:root` block in `globals.css` maps these to our semantic tokens (e.g. `--accent: var(--primary)`, `--muted: var(--muted-foreground)`, `--surface: var(--card)`, `--overlay: var(--popover)`, `--danger: var(--destructive)`). Because resolution is dynamic, every `[data-theme]` block automatically recolors all HeroUI components.
- **Conflict handling**: HeroUI's `--muted` is a *text* color; our `--muted` was a *background*. We renamed ours to `--muted-bg` and let `--muted` resolve to `--muted-foreground`. HeroUI's `--accent` (primary action) maps to our `--primary`; our former `--accent` (hover bg) is replaced by `--secondary`/`--muted-bg` in custom components.
- **Custom primitives**: Buttons, text inputs, selects, range sliders, checkboxes and toggles are hand-built in `components/primitives.tsx` (themed, zero-dependency, mobile-friendly). Overlays (Drawer/Modal) are hand-built in `components/Overlay.tsx` with Escape handling. HeroUI is used for `Tabs`, `ScrollShadow`, `Tooltip`, `Separator` where its accessibility + focus management add real value.

### 6. Claude/ChatGPT-Inspired Minimal Layout
- **Sidebar** (280px, collapsible): brand, New Chat, active provider/model, conversation list, footer (Settings, Cleanup)
- **Chat**: centered `max-w-3xl` conversation; user messages are right-aligned bubbles; assistant messages have no bubble — full-width with avatar + "Assistant" label
- **Settings**: right-side `Drawer` with HeroUI `Tabs` (Providers/Themes/MCP/Search/Skills)
- **Cleanup**: centered `Modal` with stats grid, trash list, and destructive actions

## State Management

### Zustand Stores

**themeStore.ts**
- Persists selected theme to `tenshillm-theme`
- Applies `data-theme` attribute to `<html>` element (and toggles `.dark` for any `dark:` utilities)
- 6 themes: dracula, alucard, tokyo-night, catppuccin, nord, gruvbox

**settingsStore.ts**
- `providers`: Array of API providers with models
- `activeProviderId` / `activeModelId`: Currently selected provider/model
- `mcpServers`: Remote MCP server configurations
- `searchConfig`: Web search provider and API key
- New installations default to DuckDuckGo with an empty API key
- `agentSkills`: Markdown skill files
- `defaultSystemPrompt`: Base system prompt for all conversations
- Persists to `tenshillm-settings`
- Search controls and the system prompt persist immediately after changes
- `resetSettings()` clears providers, MCP servers, skills, search, prompt, and font size

**chatStore.ts**
- `conversations`: Array of conversation metadata
- `messages`: Record<string, Message[]> keyed by conversation ID
- `isStreaming`: Request-level streaming state
- Assistant messages use optional `completionStatus` to distinguish streaming,
  completed, aborted, and failed responses
- `sidebarOpen` / `settingsOpen` / `cleanupOpen`: UI panel state

## Component Patterns

### ChatView.tsx — Streaming Flow
1. Build payload with `buildChatPayload()` from `lib/openai.ts`
2. Add MCP tools if servers are connected
3. Add search tool if enabled
4. Use `fetch` from `@tauri-apps/plugin-http` to POST to API
5. Parse response text line by line for SSE chunks
6. Handle both `content` and `reasoning_content` deltas
7. Normalize inline `<think>` blocks before displaying the answer
8. Update UI via Zustand stores

### MessageBubble.tsx — Rendering
- **User messages**: right-aligned, `rounded-2xl rounded-tr-md` bubble (asymmetric corner like Telegram/iMessage), `px-5 py-3`, `bg-user-bubble text-user-bubble-foreground`
- **Assistant messages**: NO bubble — full-width with 36px avatar + "Assistant" label (Claude/ChatGPT style), content flows naturally via markdown
- **Tool messages**: avatar (wrench) + "Tool Result" label + `<pre>` block
- Markdown rendering via `react-markdown` + `remark-gfm`
- Code blocks with `border` + `rounded-md` and border-radius var
- Copy button on hover for assistant messages (HeroUI `Tooltip` wrapper, size-7 grid place-items-center)
- Thinking indicator: 3-dot staggered bounce (`.thinking-dots` in globals.css)

### SettingsPanel.tsx — Drawer + Tabs
- Rendered inside a custom `Drawer` (right slide-over from `Overlay.tsx`) with Escape + backdrop dismissal
- Uses HeroUI `Tabs` (compound: `Tabs.ListContainer` / `Tabs.List` / `Tabs.Tab` / `Tabs.Panel`) with `selectedKey` + `onSelectionChange`
- **Providers**: CRUD for API providers and their models (custom `TextInput`/`CheckBox` primitives + inline forms)
- **Themes**: Visual theme selector with color previews
- **MCP**: Remote MCP server configuration (custom `Toggle` + `TextAreaInput` for headers)
- **Search**: Web search provider setup (custom `Toggle` + `SelectInput` + `RangeInput` + `TextInput`)
- **Skills**: Agent skill editor with Markdown content + remote install from GitHub/GitLab/SKILL.md sources, skills.sh directory search, per-skill and bulk update checks + default system prompt

### CleanupPanel.tsx — Modal
- Rendered inside a custom `Modal` (centered from `Overlay.tsx`)
- Stats grid (active chats, trash, total messages, storage)
- Trash list with restore / permanent-delete per conversation
- Destructive actions with two-step confirm: **Empty Trash**, **Clear Cache** (`localStorage.removeItem('tenshillm-search-cache')`), **Delete Everything**
- **Delete Everything** also resets settings and theme to defaults

## CSS Theming System

Themes are defined as **full HSL color values** (not component triples) on `[data-theme="..."]` blocks, so the same variables work both for our own Tailwind utilities and for HeroUI components (which consume tokens directly):

```css
[data-theme="tokyo-night"] {
  --background: hsl(233 28% 13%);
  --primary: hsl(213 81% 73%);
  --muted-bg: hsl(234 22% 18%);   /* renamed from --muted (now HeroUI's muted text) */
  --muted-foreground: hsl(223 30% 56%);
  /* ... */
}
```

Tailwind v4 maps these to utility classes via an `@theme inline` block:
```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-muted-bg: var(--muted-bg);
  /* ... */
}
```

### HeroUI Token Bridge
A single shared `:root` block maps HeroUI's design tokens to our semantic tokens. Because CSS custom property resolution is dynamic, the mapping automatically picks up each theme's values:

```css
:root {
  --accent: var(--primary);              /* HeroUI primary action  -> our primary */
  --muted: var(--muted-foreground);      /* HeroUI muted text      -> our muted-foreground */
  --surface: var(--card);                /* HeroUI card/panel bg   -> our card */
  --overlay: var(--popover);             /* HeroUI popover/modal    -> our popover */
  --danger: var(--destructive);
  --field-background: var(--card);
  --field-placeholder: var(--muted-foreground);
  --backdrop: var(--code-bg);
  /* ... */
}
```

> **Key rename**: our previous `--muted` (background) is now `--muted-bg`; `--muted` is owned by HeroUI and resolves to our `--muted-foreground`. Use `bg-muted-bg` for muted backgrounds and `text-muted-foreground` for muted text.

## Common Tasks

### Adding a New Theme
1. Add theme definition to `src/styles/globals.css` with `[data-theme="name"]` — use **full HSL color values** (e.g. `--background: hsl(233 28% 13%);`), not component triples
2. Add theme info to `THEMES` array in `src/types/index.ts`
3. Theme automatically appears in Settings > Themes (HeroUI token bridge recolors all components automatically)

### Adding a New Tauri Command
1. Add command function in `src-tauri/src/lib.rs`
2. Register in `invoke_handler` with `tauri::generate_handler![...]`
3. Call from frontend with `invoke('command_name', { args })`

### Adding a New Store
1. Create file in `src/stores/`
2. Use `zustand`'s `create()` with state and actions
3. Add persistence with `localStorage` if needed

### Running the Manual E2E Checks
1. Keep real test credentials in the ignored `.env` file; use `.env.example` for the variable reference
2. Follow `docs/testing/manual-e2e.md` for the provider, MCP, manual/remote skills, system prompt, search, chat, and Cleanup sequence
3. Remote-skill flows (install/update/uninstall) can be exercised browser-only with the DevTools shim in the runbook's Appendix A (GitHub-backed commands hit the real network; skills.sh search requires the Tauri runtime because it sends no CORS headers)
4. Never add `.env`, decoded Markdown, screenshots containing credentials, or raw API responses to Git

## Build Commands

```bash
# Frontend only (type check + build)
bun run build

# Desktop dev
bun run tauri dev

# Android dev
bun run tauri android dev

# iOS dev
bun run tauri ios dev

# Full build
bun run tauri build
```

## Known Issues & Solutions

### Desktop Build Fails with "failed to read plugin permissions"
**Problem**: `bun run tauri dev` fails with `failed to read file '.../llm-studio/src-tauri/target/debug/build/tauri-*/out/permissions/app/autogenerated/commands/app_hide.toml'` — note the `llm-studio` segment in the path even though the project lives at `tenshillm/`.
**Root cause**: The project was relocated from `tenshillm/llm-studio/src-tauri/` to `tenshillm/src-tauri/` at some point. The Tauri build script cache under `target/debug/build/tauri-*/out/` stores **absolute paths** to autogenerated permission TOML files, and these stale references break the build. Mobile targets (Android/iOS) use separate target directories so they keep working.
**Solution**: Clear only the desktop cache, preserving mobile targets:
```bash
rm -rf src-tauri/target/debug src-tauri/target/flycheck0
```
Then re-run `bun run tauri dev` — a full recompile will regenerate permission files with the correct paths.

### CORS Errors
**Problem**: `url not allowed on the configured scope`
**Solution**: Ensure `capabilities/default.json` has HTTP scope:
```json
{
  "identifier": "http:default",
  "allow": [
    {"url": "https://**"},
    {"url": "http://**"}
  ]
}
```

### Rust Build Errors (iOS)
**Problem**: `cargo build` for iOS fails with `error[E0463]: can't find crate for std` on `aarch64-apple-ios-sim`, while desktop builds work fine.
**Root cause**: Homebrew's `rust` formula ships its own cargo/rustc at `/opt/homebrew/bin/` that knows nothing about cross-compilation targets. The iOS std library lives in the rustup-managed toolchain under `~/.rustup/toolchains/`. Whichever `cargo` is first in `PATH` wins; if it's the Homebrew one, iOS builds can't find the std.

**Solution**: Install both `rust` and `rustup` from Homebrew, then put the rustup shim directory first in `PATH` (the rustup formula's `libexec/bin/` contains the real binary shims, while `/opt/homebrew/opt/rustup/bin/rustup` is a bash wrapper that breaks shim dispatch).

Setup:
```bash
brew install rust rustup
# Bootstrap the toolchain via Homebrew's rustup
$(brew --prefix rustup)/bin/rustup default stable
$(brew --prefix rustup)/bin/rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios

# Put rustup's libexec/bin FIRST in PATH (must be before /opt/homebrew/bin)
# In ~/.zshrc, prepend:  export PATH="$(brew --prefix rustup)/libexec/bin:$PATH"
# In ~/.zshenv, add:     export PATH="$(brew --prefix rustup)/libexec/bin:$PATH"
# (.zshenv is sourced by non-interactive shells too, e.g. Xcode build phases)
# In ~/.config/fish/config.fish, add AFTER Homebrew (last wins in Fish):
#   set -x PATH (brew --prefix rustup)/libexec/bin $PATH
```

**Why the shim directory matters**: `$(brew --prefix rustup)/bin/rustup` is a 161-byte bash wrapper that execs the real binary with a fixed `argv[0]`, so the shims (cargo, rustc, …) symlinked to it always dispatch as `rustup`. The Homebrew formula already provides the *real* rustup-init-style shim setup at `$(brew --prefix rustup)/libexec/bin/` (binary + symlinks that preserve `argv[0]`). Use that path.

**Why not just `rustup-init` from rustup.rs**: That puts the toolchain manager in `~/.cargo/bin/` and isn't installed via Homebrew. The Homebrew `rustup` formula already ships the same shim layout at `libexec/bin/`, so there's no need for an out-of-band installer.

**Fish shell PATH order**: In Fish, each `set -x PATH X $PATH` prepends X, so the last line wins. Add the rustup path AFTER the Homebrew path, not before.

Verify with `which cargo` → must print `/opt/homebrew/opt/rustup/libexec/bin/cargo` (the rustup shim), **not** `/opt/homebrew/bin/cargo` (the Homebrew rust formula binary).

### Android Build Errors (OpenSSL)
**Problem**: `cargo build` for Android fails with `Could not find directory of OpenSSL installation` when compiling `openssl-sys`.
**Root cause**: The `openssl-sys` crate cannot find OpenSSL for the Android target during cross-compilation.

**Solution**: Add `openssl` with the `vendored` feature to `Cargo.toml`, which compiles OpenSSL from source for the target platform:
```toml
[dependencies]
openssl = { version = "0.10", features = ["vendored"] }
```

Additionally, ensure the Android NDK toolchain is in your PATH:
```bash
# Fish shell
set -x PATH /Users/angelrios/Library/Android/sdk/ndk/30.0.14904198/toolchains/llvm/prebuilt/darwin-x86_64/bin $PATH
```

The NDK compilers have versioned names (e.g., `aarch64-linux-android21-clang`), so create symlinks without the version number:
```bash
cd /Users/angelrios/Library/Android/sdk/ndk/30.0.14904198/toolchains/llvm/prebuilt/darwin-x86_64/bin
ln -sf aarch64-linux-android21-clang aarch64-linux-android-clang
ln -sf aarch64-linux-android21-clang++ aarch64-linux-android-clang++
# Repeat for other architectures as needed
```

### Empty Response from Reasoning Models
**Problem**: Model returns `content: null` with `reasoning_content`, or places reasoning in inline `<think>` tags
**Solution**: The parser handles both fields, moves inline thinking into the collapsible Thinking section, and uses reasoning as the displayed response when content is empty

## File Naming Conventions

- Components: PascalCase (`ChatView.tsx`, `MessageBubble.tsx`)
- Stores: camelCase with `Store` suffix (`themeStore.ts`, `chatStore.ts`)
- Types: PascalCase interfaces (`ApiProvider`, `Conversation`)
- CSS: kebab-case for theme names (`tokyo-night`, `catppuccin`)
- Rust: snake_case (`lib.rs`, `chat.rs`)

## Dependencies

### Frontend (package.json)
- `@tauri-apps/api`: Tauri JS API
- `@tauri-apps/plugin-http`: HTTP requests (CORS bypass)
- `@tauri-apps/plugin-sql`: SQLite (future use)
- `@tauri-apps/plugin-fs`: File system access
- `@tauri-apps/plugin-shell`: Shell commands
- `@tauri-apps/plugin-dialog`: Native dialogs
- `@tauri-apps/plugin-clipboard-manager`: Clipboard access
- `@heroui/react` + `@heroui/styles`: HeroUI v3 component library (React Aria + Tailwind v4)
- `@fontsource-variable/inter`: Self-hosted Inter Variable font (woff2, no Google Fonts — CSP-compatible with Tauri)
- `zustand`: State management
- `react-markdown` + `remark-gfm` + `rehype-highlight`: Markdown rendering with syntax highlighting
- `lucide-react`: Icons
- `sonner`: Toast notifications
- `nanoid`: ID generation

> **Removed (shadcn/ui stack):** `radix-ui`, all `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes`. The `src/components/ui/` folder no longer exists.

### Backend (Cargo.toml)
- `tauri`: Core framework
- `tauri-plugin-*`: Various Tauri plugins
- `serde` / `serde_json`: Serialization
- `tokio`: Async runtime
- `reqwest`: HTTP client
- `openssl`: TLS/SSL with `vendored` feature for Android cross-compilation
- `uuid`: UUID generation
- `chrono`: Date/time handling
- `base64`: Base64 encoding
- `futures`: Async utilities
- `urlencoding`: URL encoding

## Security Notes

- API keys are stored in localStorage (not encrypted)
- Local E2E credentials belong in `.env`, which is ignored by Git; `.env.example` contains placeholders only
- Never include decoded system prompts, skill content, MCP headers, or raw provider responses in tracked files
- For production, consider using `tauri-plugin-stronghold` for keychain storage
- CSP is configured to allow connections to any HTTPS/HTTP endpoint
- No data is sent to external servers except user-configured API endpoints
