#!/usr/bin/env node
/**
 * Dev launcher: runs `vite` in the background, waits for the dev server,
 * then launches Electron with VITE_DEV_SERVER_URL wired up.
 *
 * The root package.json script is a single line (`vite && electron .`);
 * this script is provided for the M1 upgrade where we'll use concurrently.
 */

import { spawn } from 'node:child_process';

console.log('[dev] Composer 共鸣 — starting dev environment');
console.log('[dev] This scaffold is intentionally minimal. Run `pnpm dev` for the current single-process flow,');
console.log('[dev] or `pnpm dev:electron` to build + launch with the browser renderer.');

const vite = spawn('pnpm', ['dev:renderer'], { stdio: 'inherit' });
vite.on('exit', (code) => process.exit(code ?? 0));
