import { describe, expect, it, vi } from 'vitest';
import { buildMessage, createBroadcastSync, newSenderId } from '@caa/store';

describe('buildMessage', () => {
  it('constructs a well-formed envelope', () => {
    const msg = buildMessage('command', { hello: 'world' }, 'sender-1', 5);
    expect(msg.type).toBe('command');
    expect(msg.payload).toEqual({ hello: 'world' });
    expect(msg.sender).toBe('sender-1');
    expect(msg.seq).toBe(5);
    expect(typeof msg.timestamp).toBe('number');
  });

  it('generates a unique sender id by default', () => {
    const a = buildMessage('command', {});
    const b = buildMessage('command', {});
    expect(a.sender).not.toBe(b.sender);
  });
});

describe('newSenderId', () => {
  it('returns ids starting with "w-"', () => {
    expect(newSenderId().startsWith('w-')).toBe(true);
  });

  it('returns unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(newSenderId());
    expect(ids.size).toBeGreaterThan(90);
  });
});

describe('createBroadcastSync', () => {
  it('returns null when BroadcastChannel is unavailable', () => {
    // Simulate an environment without BroadcastChannel.
    vi.stubGlobal('BroadcastChannel', undefined);
    const handle = createBroadcastSync('test');
    expect(handle).toBeNull();
    vi.unstubAllGlobals();
  });

  it('two handles on the same channel can exchange commands', () => {
    // Minimal BroadcastChannel stub for Node environments without the global.
    const events = new Map<string, Array<(ev: { data: unknown }) => void>>();
    class FakeBroadcastChannel {
      constructor(public readonly name: string) {
        if (!events.has(name)) events.set(name, []);
      }
      set onmessage(handler: ((ev: { data: unknown }) => void) | null) {
        const arr = events.get(this.name)!;
        const idx = arr.indexOf(handler!);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(handler!);
      }
      get onmessage() { return null; }
      postMessage(data: unknown) {
        for (const h of events.get(this.name) ?? []) h({ data });
      }
      close() {}
    }
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    const receivedFromA: unknown[] = [];
    const receivedFromB: unknown[] = [];
    // Two independent handles, each with their own sender id.
    const handleA = createBroadcastSync('ch', {
      onCommand: (cmd) => receivedFromB.push(cmd),
    }, 'A');
    const handleB = createBroadcastSync('ch', {
      onCommand: (cmd) => receivedFromA.push(cmd),
    }, 'B');

    // Each handle skips its own messages but receives the other's.
    handleA!.sendCommand({ type: 'note.add', source: 'agent' } as never);
    handleB!.sendCommand({ type: 'note.add', source: 'human' } as never);

    expect(receivedFromA.length).toBe(1); // A received B's message
    expect(receivedFromB.length).toBe(1); // B received A's message

    handleA!.close();
    handleB!.close();
    vi.unstubAllGlobals();
  });
});
