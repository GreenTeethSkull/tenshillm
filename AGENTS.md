# AGENTS.md — TenshiLLM Agent Context

## Project Overview

**TenshiLLM** is a mobile-first AI chat client built with Tauri v2 + React + TypeScript + Bun. It allows users to interact with any OpenAI-compatible LLM API through a beautiful, themeable interface.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Tauri | v2.x |
| Frontend | React | 18+ |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | v4 |
| State | Zustand | 5.x |
| Bundler | Vite | 7.x |
| Package Manager | Bun | 1.3+ |
| Backend | Rust | 1.95+ |

## Architecture

### Frontend (React + TypeScript)

```
src/
├── main.tsx                  # Entry point, renders App
├── App.tsx                   # Root component, theme provider
├── types/index.ts            # All TypeScript interfaces
├── styles/globals.css        # Tailwind config + 9 theme definitions
├── stores/                   # Zustand state management
│   ├── themeStore.ts         # Theme selection persistence
│   ├── settingsStore.ts      # Providers, MCP, skills, search config
│   └── chatStore.ts          # Conversations, messages, UI state
├── lib/
│   └── openai.ts             # OpenAI payload builder + stream parser
└── components/
    ├── sidebar/Sidebar.tsx   # Conversation list + navigation
    ├── chat/
    │   ├── ChatView.tsx      # Main chat interface + streaming logic
    │   ├── MessageBubble.tsx # Message rendering with Markdown
    │   └── MessageInput.tsx  # Input with image upload support
    ├── settings/SettingsPanel.tsx  # All configuration UI
    └── cleanup/CleanupPanel.tsx    # Data cleanup tools
```

### Backend (Rust + Tauri)

```
src-tauri/
├── Cargo.toml                # Rust dependencies
├── tauri.conf.json           # Tauri app configuration
├── capabilities/default.json # Plugin permissions + HTTP scope
└── src/
    ├── main.rs               # Rust entry point
    └── lib.rs                # Tauri commands:
                              #   - send_chat_request
                              #   - test_provider_connection
                              #   - mcp_list_tools
                              #   - mcp_call_tool
                              #   - web_search
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

### 3. MCP Remote Only
- Mobile platforms (Android/iOS) can't spawn local processes reliably
- Only Streamable HTTP transport is supported
- STDIO transport is excluded for mobile compatibility

### 4. localStorage for Persistence
- All settings, conversations, and messages stored in localStorage
- Keys prefixed with `tenshillm-` (e.g., `tenshillm-settings`, `tenshillm-theme`)
- No cloud storage — 100% local

## State Management

### Zustand Stores

**themeStore.ts**
- Persists selected theme to `tenshillm-theme`
- Applies `data-theme` attribute to `<html>` element
- 9 themes: light, tokyo-night, dracula, catppuccin, gruvbox, nord, solarized, one-dark, everforest

**settingsStore.ts**
- `providers`: Array of API providers with models
- `activeProviderId` / `activeModelId`: Currently selected provider/model
- `mcpServers`: Remote MCP server configurations
- `searchConfig`: Web search provider and API key
- `agentSkills`: Markdown skill files
- `defaultSystemPrompt`: Base system prompt for all conversations
- Persists to `tenshillm-settings`

**chatStore.ts**
- `conversations`: Array of conversation metadata
- `messages`: Record<string, Message[]> keyed by conversation ID
- `isStreaming` / `streamingContent`: Streaming state
- `sidebarOpen` / `settingsOpen` / `cleanupOpen`: UI panel state

## Component Patterns

### ChatView.tsx — Streaming Flow
1. Build payload with `buildChatPayload()` from `lib/openai.ts`
2. Add MCP tools if servers are connected
3. Add search tool if enabled
4. Use `fetch` from `@tauri-apps/plugin-http` to POST to API
5. Parse response text line by line for SSE chunks
6. Handle both `content` and `reasoning_content` deltas
7. Update UI via Zustand stores

### MessageBubble.tsx — Rendering
- User messages: right-aligned, accent color bubble
- Assistant messages: left-aligned, surface color bubble
- Markdown rendering via `react-markdown` + `remark-gfm`
- Code blocks with syntax highlighting via `rehype-highlight`
- Copy button on hover for assistant messages

### SettingsPanel.tsx — Tabs
- **Providers**: CRUD for API providers and their models
- **Themes**: Visual theme selector with color previews
- **MCP**: Remote MCP server configuration
- **Search**: Web search provider setup
- **Skills**: Agent skill editor with Markdown content

## CSS Theming System

Themes use CSS custom properties prefixed with `--theme-`:

```css
[data-theme="tokyo-night"] {
  --theme-bg: #1a1b26;
  --theme-accent: #7aa2f7;
  --theme-text: #c0caf5;
  /* ... */
}
```

Tailwind v4 maps these to utility classes:
```css
@theme {
  --color-bg: var(--theme-bg);
  --color-accent: var(--theme-accent);
  /* ... */
}
```

## Common Tasks

### Adding a New Theme
1. Add theme definition to `src/styles/globals.css` with `[data-theme="name"]`
2. Add theme info to `THEMES` array in `src/types/index.ts`
3. Theme automatically appears in Settings > Themes

### Adding a New Tauri Command
1. Add command function in `src-tauri/src/lib.rs`
2. Register in `invoke_handler` with `tauri::generate_handler![...]`
3. Call from frontend with `invoke('command_name', { args })`

### Adding a New Store
1. Create file in `src/stores/`
2. Use `zustand`'s `create()` with state and actions
3. Add persistence with `localStorage` if needed

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

### Rust Build Errors
**Problem**: `cargo build` fails
**Solution**: Install Rust via Homebrew: `brew install rust`

### Empty Response from Reasoning Models
**Problem**: Model returns `content: null` with `reasoning_content`
**Solution**: The streaming parser handles this — if only reasoning is present, it becomes the displayed response

## File Naming Conventions

- Components: PascalCase (`ChatView.tsx`, `MessageBubble.tsx`)
- Stores: camelCase with `Store` suffix (`themeStore.ts`, `chatStore.ts`)
- Types: PascalCase interfaces (`ApiProvider`, `Conversation`)
- CSS: kebab-case for theme names (`tokyo-night`, `one-dark`)
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
- `zustand`: State management
- `react-markdown`: Markdown rendering
- `remark-gfm`: GitHub Flavored Markdown
- `rehype-highlight`: Code syntax highlighting
- `lucide-react`: Icons
- `nanoid`: ID generation
- `date-fns`: Date formatting

### Backend (Cargo.toml)
- `tauri`: Core framework
- `tauri-plugin-*`: Various Tauri plugins
- `serde` / `serde_json`: Serialization
- `tokio`: Async runtime
- `reqwest`: HTTP client
- `uuid`: UUID generation
- `chrono`: Date/time handling
- `base64`: Base64 encoding
- `futures`: Async utilities
- `urlencoding`: URL encoding

## Security Notes

- API keys are stored in localStorage (not encrypted)
- For production, consider using `tauri-plugin-stronghold` for keychain storage
- CSP is configured to allow connections to any HTTPS/HTTP endpoint
- No data is sent to external servers except user-configured API endpoints
