/**
 * BroadcastChannel-based cross-window/cross-context sync.
 *
 * When multiple windows or contexts (Renderer, DevTools, future cloud) are
 * open, this module lets them stay in sync without a central server.
 *
 * This is a no-op stub at M0 scaffold level — a real implementation will
 * serialize Commands over BroadcastChannel and re-dispatch them locally.
 */

export interface SyncMessage {
  type: 'command' | 'sync-request' | 'sync-response';
  payload: unknown;
  sender: string;
  timestamp: number;
}

export function createBroadcastSync(
  channelName: string,
  handler: (msg: SyncMessage) => void,
): { post: (msg: SyncMessage) => void; close: () => void } | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event) => {
    const msg = event.data as SyncMessage;
    // Don't echo our own messages back.
    if (msg.sender === channel.name) return;
    handler(msg);
  };
  return {
    post: (msg) => channel.postMessage(msg),
    close: () => channel.close(),
  };
}
