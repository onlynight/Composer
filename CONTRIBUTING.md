# Contributing to Composer 共鸣

Thank you for considering a contribution! This repository is currently in the **v0.0.1 design phase** (M0 scaffold just landed). Design review PRs are the most valuable contributions right now.

## Ways to help

- **Design reviews** — file PRs against `docs/` to tighten architecture, tech stack, or milestone plans.
- **Technical discussions** — GitHub Discussions, or an issue with `topic/discussion` label.
- **Code contributions** — pick an `M*` milestone (see `docs/milestones.md`), claim it, open a draft PR.
- **Use case reports** — tell us what kind of music you want to make with this.

## Getting started

```bash
# Prerequisites: Node 20+, pnpm 9+
corepack enable
corepack prepare pnpm@9.15.0 --activate

git clone <this repo>
cd composer-resonance
pnpm install

# Develop
pnpm dev:renderer   # Vite dev server, open http://localhost:5173
pnpm dev:electron   # Build + launch Electron with dev renderer

# Test
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E (renderer only)
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
```

## Style

- **TypeScript strict mode** — no `any` unless you have a solid reason (and a `// eslint-disable-next-line` with justification).
- **Command Pattern discipline** — every state mutation goes through `packages/caa-core/src/command.ts`.
- **Conventional Commits** — e.g. `feat(core): add note.add command`, `docs: tighten architecture diagram`.
- **English for code, docs can be bilingual** — the README is bilingual by design.

## Licensing

By contributing, you agree that your contributions are licensed under **Apache-2.0** (see `LICENSE`).
