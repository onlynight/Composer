/**
 * @caa/agent — Agent Runtime scaffold.
 *
 * M0 scaffold only exposes the interfaces and mode registry. Real LLM client
 * integrations (Anthropic, OpenAI, local llama.cpp, custom endpoint) are
 * added at M5.5 as separate modules under `llm-client/`.
 */

import type { Command } from '@caa/core';

/* -------------------------------------------------------------------------- */
/* Agent modes                                                                 */
/* -------------------------------------------------------------------------- */

export type AgentMode = 'composer' | 'arranger' | 'critic' | 'teacher';

export const AGENT_MODES: ReadonlyArray<{ id: AgentMode; label: string; description: string }> = [
  { id: 'composer', label: 'Composer', description: 'Compose melodies, harmonies, progressions' },
  { id: 'arranger', label: 'Arranger', description: 'Orchestrate instruments, layer textures, dynamics' },
  { id: 'critic', label: 'Critic', description: 'Analyze the piece, suggest improvements, explain theory' },
  { id: 'teacher', label: 'Teacher', description: 'Educate on music theory and the DAW' },
];

/* -------------------------------------------------------------------------- */
/* LLM client interface                                                        */
/* -------------------------------------------------------------------------- */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMClientOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMClient {
  readonly id: string;
  readonly label: string;
  chat(messages: ChatMessage[], opts?: LLMClientOptions): Promise<LLMResponse>;
  chatStream?(
    messages: ChatMessage[],
    opts: LLMClientOptions & { onDelta: (chunk: string) => void },
  ): Promise<LLMResponse>;
}

/* -------------------------------------------------------------------------- */
/* Tool registry (MCP-backed)                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A Tool maps to an MCP tool definition. The Agent Runtime dispatches calls
 * to the MCP Server (running in the Main Process) which then produces
 * Commands that flow back into the Project Store.
 */
export interface AgentTool {
  definition: ToolDefinition;
  /**
   * Execute the tool and return either a Command (to be dispatched) or a
   * plain result for read-only tools (e.g. `project.get_state`).
   */
  execute: (args: Record<string, unknown>) => Promise<Command | Record<string, unknown>>;
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.definition.name, tool);
  }
  unregister(name: string): void {
    this.tools.delete(name);
  }
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }
  list(): AgentTool[] {
    return [...this.tools.values()];
  }
  toJSONSchema(): ToolDefinition[] {
    return this.list().map((t) => t.definition);
  }
}

export const defaultToolRegistry = new ToolRegistry();

/* -------------------------------------------------------------------------- */
/* Guardrails                                                                */
/* -------------------------------------------------------------------------- */

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface Guardrails {
  /** Check if a tool call is allowed under current policy. */
  checkPermission(toolCall: ToolCall): PermissionResult;
  /** Track token/cost budget for the session. */
  budget: { usedTokens: number; budgetTokens: number };
}

export function defaultGuardrails(): Guardrails {
  return {
    checkPermission: () => ({ allowed: true }),
    budget: { usedTokens: 0, budgetTokens: 100_000 },
  };
}
