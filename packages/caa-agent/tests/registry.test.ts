import { describe, expect, it } from 'vitest';
import {
  AGENT_MODES,
  type AgentMode,
  type AgentTool,
  ToolRegistry,
  defaultGuardrails,
  defaultToolRegistry,
} from '@caa/agent';

const makeTool = (name: string, description = `Tool ${name}`): AgentTool => ({
  definition: {
    name,
    description,
    inputSchema: { type: 'object', properties: {} },
  },
  execute: async () => ({ result: 'ok' }),
});

describe('AGENT_MODES', () => {
  it('has exactly 4 modes with expected ids', () => {
    expect(AGENT_MODES).toHaveLength(4);
    const ids = AGENT_MODES.map((m) => m.id);
    expect(ids).toEqual(['composer', 'arranger', 'critic', 'teacher']);
  });

  it('every mode has a non-empty label and description', () => {
    for (const m of AGENT_MODES) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(['composer', 'arranger', 'critic', 'teacher']).toContain(m.id as AgentMode);
    }
  });
});

describe('ToolRegistry', () => {
  it('starts empty', () => {
    const r = new ToolRegistry();
    expect(r.list()).toEqual([]);
    expect(r.toJSONSchema()).toEqual([]);
  });

  it('register / get / unregister works', async () => {
    const r = new ToolRegistry();
    const t = makeTool('note.add');
    r.register(t);
    expect(r.get('note.add')).toBe(t);
    expect(r.list()).toHaveLength(1);
    r.unregister('note.add');
    expect(r.get('note.add')).toBeUndefined();
  });

  it('toJSONSchema returns only definitions, not implementations', () => {
    const r = new ToolRegistry();
    r.register(makeTool('a'));
    r.register(makeTool('b'));
    const schemas = r.toJSONSchema();
    expect(schemas).toHaveLength(2);
    expect(schemas.map((s) => s.name)).toEqual(['a', 'b']);
    expect(schemas.every((s) => !('execute' in s))).toBe(true);
  });

  it('register overwrites a previously registered tool of the same name', () => {
    const r = new ToolRegistry();
    const t1 = makeTool('dup', 'first');
    const t2 = makeTool('dup', 'second');
    r.register(t1);
    r.register(t2);
    expect(r.get('dup')).toBe(t2);
    expect(r.list()).toHaveLength(1);
  });

  it('execute dispatches to the tool implementation', async () => {
    const r = new ToolRegistry();
    const t: AgentTool = {
      definition: { name: 'echo', description: 'echo', inputSchema: {} },
      execute: async (args) => ({ echoed: args }),
    };
    r.register(t);
    const result = await r.get('echo')!.execute({ foo: 'bar' });
    expect(result).toEqual({ echoed: { foo: 'bar' } });
  });
});

describe('defaultToolRegistry', () => {
  it('is a singleton ToolRegistry instance', () => {
    expect(defaultToolRegistry).toBeInstanceOf(ToolRegistry);
    expect(defaultToolRegistry.list()).toEqual([]);
  });
});

describe('defaultGuardrails', () => {
  it('allows everything by default with a 100k token budget', () => {
    const g = defaultGuardrails();
    expect(g.checkPermission({ id: 'x', name: 'n', arguments: {} }).allowed).toBe(true);
    expect(g.budget).toEqual({ usedTokens: 0, budgetTokens: 100_000 });
  });
});
