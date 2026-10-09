# Changelog

All notable changes to Composer 共鸣 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-11

### Added

- **M0 scaffold**: pnpm monorepo with `packages/caa-core`, `packages/caa-store`, `packages/caa-agent`, `packages/caa-midi-ir`.
- **Electron 33 + Vite 6 + React 18 + TypeScript 5.7** toolchain, ESM throughout.
- **Design docs** under `docs/`: architecture, tech-stack, data-model, mcp-tools, agent-design, human-agent-collab, milestones.
- **Foundation logic in `@caa/core`**: timeline conversions, note utils, scales (9), chord parsing (14 qualities), project CRUD, MIDI IR validator, and Command Pattern with factory helpers (note add/remove/update, track add/remove/update, batch, project update).
- **State management**: Zustand + Command store with undo/redo (100 steps), BroadcastChannel sync scaffold.
- **Agent Runtime scaffold**: LLMClient interface (streaming), ToolRegistry (MCP-backed), Guardrails, 4 AgentModes (composer / arranger / critic / teacher).
- **Renderer scaffold**: dark-theme DAW shell with TopBar, TrackList, Timeline, PianoRoll, Transport, Mixer, AgentPanel.
- **Testing stack**: Vitest 3 unit tests (31 tests across 4 files), Playwright E2E smoke.
- **CI**: GitHub Actions matrix across OS × Node versions, typecheck / lint / test / e2e / build / package.
- **Project meta**: Apache-2.0 LICENSE, TRADEMARK.md, CONTRIBUTING.md, PR template, VS Code extensions/settings.
- **Dev workflow**: `concurrently` + `cross-env` + `wait-on` for parallel `pnpm dev` (Vite + Electron). `electron/tsconfig.build.json` compiles main process to `dist/main/`.

### Changed

- Electron main: detect dev vs production by `VITE_DEV_SERVER_URL` presence (previously also keyed on `!app.isPackaged`, which broke `electron .` from source without a dev server).

### Notes

- Audio (FluidSynth), MCP Server, storage, and VST/JUCE integrations are stubbed. See `docs/milestones.md` for the plan.
- Renderer currently uses `nodeIntegration: true` for M0 simplicity; will switch to `contextIsolation` + typed preload at M1.
- Windows users: on first install, `pnpm install` downloads ~240MB of Electron + deps. If the Electron postinstall hangs behind a proxy, set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` then run `pnpm exec electron --version` to trigger a manual download.

### M0 verification

- `pnpm install` ✅
- `pnpm test` ✅ 31/31 pass
- `pnpm typecheck` ✅ clean (strict)
- `pnpm lint` ✅ clean
- `pnpm build` ✅ → `dist/renderer/` + `dist/main/{main,preload}.js`
- `electron .` ✅ launches BrowserWindow and loads `dist/renderer/index.html` from disk

