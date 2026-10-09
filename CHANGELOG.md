# Changelog

All notable changes to Composer 共鸣 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-11

### Added

- **M0 scaffold**: pnpm monorepo with `packages/caa-core`, `packages/caa-store`, `packages/caa-agent`, `packages/caa-midi-ir`.
- **Electron + Vite + React + TypeScript** toolchain, esm throughout.
- **Design docs** under `docs/`: architecture, tech-stack, data-model, mcp-tools, agent-design, human-agent-collab, milestones.
- **Foundation logic in `@caa/core`**: timeline conversions, note utils, scales, chord parsing, project CRUD, Command Pattern with factory helpers.
- **State management**: Zustand + Command store with undo/redo.
- **Renderer scaffold**: dark-theme DAW shell with TopBar, TrackList, Timeline, PianoRoll, Transport, Mixer, AgentPanel.
- **Testing stack**: Vitest unit tests (timeline / music-theory / command / midi-ir), Playwright E2E smoke.
- **CI**: GitHub Actions with matrix across OS × Node versions, typecheck / lint / test / e2e / build / package.
- **Project meta**: Apache-2.0 LICENSE, TRADEMARK.md, CONTRIBUTING.md, PR template.

### Notes

- Audio (FluidSynth), MCP Server, storage, and VST/JUCE integrations are stubbed. See `docs/milestones.md` for the plan.
- Renderer currently uses `nodeIntegration: true` for M0 simplicity; will switch to `contextIsolation` + typed preload at M1.
