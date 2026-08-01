# TenshiLLM

> Mobile-first AI chat client built with Tauri v2, React, and Bun. Connect to any OpenAI-compatible API, chat with reasoning models, execute MCP tools, and customize your experience with 6 curated themes and a Claude/ChatGPT-inspired minimal interface.

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2-blue" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/HeroUI-v3-ffd700" alt="HeroUI v3" />
  <img src="https://img.shields.io/badge/Tailwind-v4-38bdf8" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Bun-1.3-fbf0cf" alt="Bun" />
  <img src="https://img.shields.io/badge/Rust-1.96-dea584" alt="Rust" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Features

### Core Chat
- **OpenAI-compatible API**: Connect to any provider (OpenRouter, Ollama, OpenCode, custom endpoints)
- **Streaming responses**: Real-time SSE streaming with live updates
- **Reasoning model support**: Full support for models with `reasoning_content` (e.g., mimo-v2.5-pro)
- **Markdown rendering**: Rich text with syntax highlighting for code blocks
- **Multi-conversation**: Manage multiple conversations with sidebar navigation

### Multimodal
- **Image upload**: Send images to vision-capable models (JPEG, PNG, WebP, GIF)
- **Camera integration**: Capture images directly from device camera

### MCP (Model Context Protocol)
- **Remote MCP servers**: Connect to MCP servers via Streamable HTTP transport
- **Tool discovery**: Automatic discovery of available tools from connected servers
- **Tool execution**: LLM can invoke MCP tools during conversations

### Agent Skills
- **Markdown skill files**: Define skills as `.md` files that expand model capabilities
- **Dynamic injection**: Skills are injected into the system prompt based on context
- **In-app editor**: Create and edit skills directly within the app

### Web Search
- **Multiple providers**: Tavily, SerpAPI, Brave Search, DuckDuckGo
- **Toggle on/off**: Enable/disable web search per conversation
- **Contextual results**: Search results are provided as context to the LLM

### Themes (6 curated)
| Theme | Style | Type |
|-------|-------|------|
| Dracula | Official dark default | Dark |
| Alucard | Official Dracula light | Light |
| Tokyo Night | Calm purple-blue | Dark |
| Catppuccin Mocha | Soothing pastel | Dark |
| Nord | Arctic cool tones | Dark |
| Gruvbox Dark | Retro warm | Dark |

### Data Management
- **100% local storage**: All data stays on your device
- **Soft delete**: Conversations go to trash before permanent deletion
- **Cleanup tools**: Empty trash, clear cache, delete everything
- **Export/backup**: Export conversations as JSON

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Tauri WebView                   │
│  ┌───────────────────────────────────────────┐   │
│  │           React Frontend (Vite)           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐ │   │
│  │  │  Chat   │ │ Settings│ │  Cleanup    │ │   │
│  │  │  View   │ │  Panel  │ │  Manager    │ │   │
│  │  └────┬────┘ └────┬────┘ └──────┬──────┘ │   │
│  │       │           │             │         │   │
│  │  ┌────┴───────────┴─────────────┴──────┐  │   │
│  │  │        Core State (Zustand)         │  │   │
│  │  └────────────────┬────────────────────┘  │   │
│  └───────────────────┼───────────────────────┘   │
│                      │ IPC (invoke)              │
│  ┌───────────────────┴───────────────────────┐   │
│  │           Rust Backend (Tauri)            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │   │
│  │  │ API      │ │ MCP      │ │ Search    │ │   │
│  │  │ Client   │ │ Manager  │ │ Engine    │ │   │
│  │  └──────────┘ └──────────┘ └───────────┘ │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Tauri v2 | Cross-platform desktop/mobile framework |
| Frontend | React 19 + TypeScript | UI components and state management |
| UI Library | HeroUI v3 | Accessible components built on React Aria + Tailwind v4 (no provider needed) |
| Styling | Tailwind CSS v4 | Utility-first CSS with HSL theme variables |
| State | Zustand | Lightweight state management |
| Bundler | Vite | Fast development and build tool |
| Package Manager | Bun | Fast JavaScript runtime and package manager |
| Backend | Rust | High-performance native backend |
| HTTP | reqwest + tauri-plugin-http | HTTP requests with CORS bypass |
| Storage | localStorage | Client-side persistence |
| Font | Inter Variable | Self-hosted via `@fontsource-variable/inter` (woff2, CSP-compatible) |

---

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Rust](https://www.rust-lang.org/tools/install) (via Homebrew: `brew install rust rustup`)
- [Tauri CLI prerequisites](https://v2.tauri.app/start/prerequisites/)

### For Android development
- Android Studio with SDK Platform, NDK, and Build Tools
- `ANDROID_HOME` and `NDK_HOME` environment variables
- NDK toolchain in PATH for cross-compilation:
  ```bash
  # Fish shell
  set -x PATH /Users/angelrios/Library/Android/sdk/ndk/30.0.14904198/toolchains/llvm/prebuilt/darwin-x86_64/bin $PATH
  ```

### For iOS development (macOS only)
- Xcode with iOS SDK
- CocoaPods (`brew install cocoapods`)
- Rust toolchain with iOS targets (see "Troubleshooting" below)

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd tenshillm

# Install dependencies
bun install

# Initialize mobile targets (optional)
bun run tauri android init
bun run tauri ios init
```

---

## Development

```bash
# Desktop development
bun run tauri dev

# Android development
bun run tauri android dev

# iOS development
bun run tauri ios dev
```

---

## Building

```bash
# Build for desktop
bun run tauri build

# Build for Android
bun run tauri android build

# Build for iOS
bun run tauri ios build
```

---

## Quality Checks

```bash
# Frontend tests
bun run test

# Frontend coverage
bun run test:coverage

# Frontend lint
bun run lint

# Rust lint and tests
bun run lint:rust
bun run test:rust

# Full validation: lint, tests and production build
bun run check
```

---

## Project Structure

```
tenshillm/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component, theme application
│   ├── types/index.ts            # TypeScript type definitions
│   ├── styles/globals.css        # Tailwind + HeroUI styles + 6 themes + token bridge
│   ├── stores/                   # Zustand state management
│   │   ├── themeStore.ts         # Theme state
│   │   ├── settingsStore.ts      # Providers, MCP, skills, search config
│   │   └── chatStore.ts          # Conversations and messages
│   ├── lib/
│   │   ├── openai.ts             # OpenAI payload builder + stream parser
│   │   └── utils.ts              # Lightweight `cn()` className joiner
│   └── components/
│       ├── Overlay.tsx           # Custom Drawer (slide-over) + Modal (centered)
│       ├── primitives.tsx        # Themed Toggle/TextInput/Select/Range/Checkbox/Buttons
│       ├── sidebar/Sidebar.tsx   # Conversation list + navigation
│       ├── chat/
│       │   ├── ChatView.tsx      # Main chat interface + streaming logic
│       │   ├── MessageBubble.tsx # Message display with Markdown
│       │   └── MessageInput.tsx  # Input with image upload
│       ├── settings/SettingsPanel.tsx  # Drawer + HeroUI Tabs (5 sections)
│       └── cleanup/CleanupPanel.tsx    # Modal with stats + cleanup actions
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   ├── capabilities/default.json # Plugin permissions
│   └── src/
│       ├── main.rs               # Rust entry point
│       └── lib.rs                # Tauri commands (API, MCP, search)
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite configuration
├── AGENTS.md                     # Agent context documentation
└── README.md                     # This file
```

---

## Configuration

### Adding a Provider

1. Open **Settings** (gear icon in sidebar)
2. Go to **Providers** tab
3. Click **Add Provider**
4. Enter:
   - **Name**: e.g., "OpenRouter"
   - **Base URL**: e.g., `https://openrouter.ai/api/v1`
   - **API Key**: Your API key
5. Click **Save**
6. Click **Add Model** under the provider
7. Enter model details (ID, name, capabilities)
8. Click the model to set it as active

### Adding MCP Servers

1. Open **Settings** > **MCP** tab
2. Click **Add Server**
3. Enter:
   - **Name**: e.g., "Sentry"
   - **URL**: e.g., `https://mcp.sentry.dev/mcp`
   - **Headers** (optional): `{"Authorization": "Bearer token"}`
4. Click **Save**

### Adding Agent Skills

1. Open **Settings** > **Skills** tab
2. Click **Add Skill**
3. Enter:
   - **Name**: e.g., "SQL Expert"
   - **Description**: Short description
   - **Content**: Markdown instructions for the model
4. Click **Save**

### Enabling Web Search

1. Open **Settings** > **Search** tab
2. Toggle **Enable web search**
3. Select provider (Tavily recommended)
4. Enter API key
5. Adjust max results slider

---

## Supported Models

TenshiLLM works with any OpenAI-compatible API. Tested with:

| Provider | Models |
|----------|--------|
| OpenCode | mimo-v2.5-pro, mimo-v2.5, deepseek-v4-pro, qwen3.7-max, kimi-k2.6 |
| OpenRouter | GPT-4o, Claude 3.5, Llama 3.1, Mistral |
| Ollama | Any local model |
| Together AI | Llama, Mixtral, CodeLlama |
| Groq | Llama 3, Mixtral |

---

## API Format

TenshiLLM sends requests in OpenAI chat completions format:

```json
{
  "model": "mimo-v2.5-pro",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "max_tokens": 4096,
  "temperature": 0.7
}
```

For vision models, images are sent as base64:

```json
{
  "role": "user",
  "content": [
    {"type": "text", "text": "What's in this image?"},
    {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
  ]
}
```

---

## Troubleshooting

### Desktop build fails with "failed to read plugin permissions"
If `bun run tauri dev` fails with a path containing a stale directory name (e.g. `llm-studio/src-tauri/...`), the Tauri build cache holds absolute paths from a previous project location. Mobile targets (Android/iOS) keep working because they use separate target directories.

Fix it by clearing only the desktop cache:
```bash
rm -rf src-tauri/target/debug src-tauri/target/flycheck0
```
Then re-run `bun run tauri dev` — the recompile regenerates permission files with the correct paths. See [AGENTS.md](AGENTS.md#desktop-build-fails-with-failed-to-read-plugin-permissions) for details.

### "url not allowed on the configured scope"
The HTTP plugin scope needs to be configured in `src-tauri/capabilities/default.json`. Ensure it includes:
```json
{
  "identifier": "http:default",
  "allow": [
    {"url": "https://**"},
    {"url": "http://**"}
  ]
}
```

### Build fails with Rust errors (iOS)
Ensure Rust is installed via Homebrew with rustup for iOS cross-compilation:
```bash
brew install rust rustup
$(brew --prefix rustup)/bin/rustup default stable
$(brew --prefix rustup)/bin/rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
```

Then configure your shell PATH to use the rustup shims:
```bash
# Fish shell (add to ~/.config/fish/config.fish AFTER Homebrew path)
set -x PATH (brew --prefix rustup)/libexec/bin $PATH

# Zsh (add to ~/.zshrc)
export PATH="$(brew --prefix rustup)/libexec/bin:$PATH"
```

See [AGENTS.md](AGENTS.md#rust-build-errors-ios) for detailed explanation.

### Android build fails with OpenSSL errors
The `openssl-sys` crate cannot find OpenSSL for Android cross-compilation. This is already fixed in `Cargo.toml` with the `vendored` feature:
```toml
openssl = { version = "0.10", features = ["vendored"] }
```

Additionally, ensure the Android NDK toolchain is in your PATH and create symlinks for the compilers:
```bash
# Add NDK to PATH (Fish shell)
set -x PATH /Users/angelrios/Library/Android/sdk/ndk/30.0.14904198/toolchains/llvm/prebuilt/darwin-x86_64/bin $PATH

# Create symlinks without version numbers
cd /Users/angelrios/Library/Android/sdk/ndk/30.0.14904198/toolchains/llvm/prebuilt/darwin-x86_64/bin
ln -sf aarch64-linux-android21-clang aarch64-linux-android-clang
ln -sf aarch64-linux-android21-clang++ aarch64-linux-android-clang++
```

See [AGENTS.md](AGENTS.md#android-build-errors-openssl) for detailed explanation.

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Author

**Angel Rios** - SRE at Pacífico Seguros & Co-founder of AVR Solutions

---

## Acknowledgments

- [Tauri](https://tauri.app) - Cross-platform framework
- [React](https://react.dev) - UI library
- [HeroUI](https://www.heroui.com) - UI component library (React Aria + Tailwind v4)
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [Zustand](https://zustand-demo.pmnd.rs) - State management
- [Lucide](https://lucide.dev) - Icon library
- [Sonner](https://sonner.emilkowal.ski) - Toast notifications
