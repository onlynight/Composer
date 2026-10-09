/**
 * BroadcastChannel-based cross-window command sync.
 *
 * Every BrowserWindow (main, dev tools, future cloud bridge, etc.) can
 * participate in the same BroadcastChannel. Commands are serialized as
 * plain objects; each receiver runs `execute` locally to stay consistent
 * without needing the original source's Project state.
 *
 * Design notes:
 *   - Receivers are responsible for their own undo/redo bookkeeping.
 *   - We skip the sender's own messages to avoid echo loops.
 *   - All messages carry a monotonic id for deduplication.
 */

import type { Command } from '@caa/core';

export const DEFAULT_CHANNEL = 'caa.project-sync';

export interface SyncMessage {
  /** Discriminator. */
  type: 'command' | 'sync-request' | 'sync-response';
  /** Payload — Commands for 'command', ids for the others. */
  payload: unknown;
  /** Sender instance id. */
  sender: string;
  /** Monotonic (per-sender) sequence number for dedup. */
  seq: number;
  /** Timestamp (ms). */
  timestamp: number;
}

export interface SyncListener {
  /** Called when a Command arrives from another window. */
  onCommand?: (command: Command) => void;
  /** Called on the rare sync-request (e.g. a new window joined). */
  onSyncRequest?: (requester: string) => void;
  /** Called on any other message (for future extension). */
  onMessage?: (msg: SyncMessage) => void;
}

export interface SyncHandle {
  readonly channel: BroadcastChannel;
  readonly senderId: string;
  post: (msg: SyncMessage) => void;
  sendCommand: (command: Command) => void;
  close: () => void;
}

/** Random instance id for this BrowserWindow. */
export function newSenderId(): string {
  return `w-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a BroadcastChannel-based sync handle. Returns null if BroadcastChannel
 * is unavailable (older browsers / SSR).
 */
export function createBroadcastSync(
  channelName: string = DEFAULT_CHANNEL,
  listener: SyncListener = {},
  senderId: string = newSenderId(),
): SyncHandle | null {
  if (typeof BroadcastChannel === 'undefined') return null;

  const channel = new BroadcastChannel(channelName);
  let seq = 0;

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    // Skip our own messages.
    if (msg.sender === senderId) return;
    listener.onMessage?.(msg);
    if (msg.type === 'command' && listener.onCommand) {
      listener.onCommand(msg.payload as Command);
    } else if (msg.type === 'sync-request' && listener.onSyncRequest) {
      listener.onSyncRequest(msg.sender);
    }
  };

  return {
    channel,
    senderId,
    post: (msg) => channel.postMessage(msg),
    sendCommand: (command) => {
      channel.postMessage({
        type: 'command',
        payload: command,
        sender: senderId,
        seq: seq++,
        timestamp: Date.now(),
      } satisfies SyncMessage);
    },
    close: () => channel.close(),
  };
}

/** Convenience: build a message envelope for testing without needing a real channel. */
export function buildMessage(
  type: SyncMessage['type'],
  payload: unknown,
  sender = newSenderId(),
  seq = 0,
): SyncMessage {
  return { type, payload, sender, seq, timestamp: Date.now() };
}
