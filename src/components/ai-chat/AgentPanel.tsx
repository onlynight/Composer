import { useState } from 'react';
import { AGENT_MODES, type AgentMode } from '@caa/agent';

interface Props {
  onTryDemo?: () => void;
}

interface LocalMessage {
  role: 'assistant' | 'user';
  text: string;
}

export function AgentPanel({ onTryDemo }: Props): JSX.Element {
  const [mode, setMode] = useState<AgentMode>('composer');
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      role: 'assistant',
      text: 'Hi, I am your Composer 共鸣 agent. In this scaffold I cannot call an LLM yet — press the suggestions below to try UI scaffolding, or wait for M5.5 when real tool calls land.',
    },
  ]);
  const [draft, setDraft] = useState('');

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: 'user', text },
      {
        role: 'assistant',
        text: `[${mode}] (scaffold) I would normally reason about this now. Try: "add a C major arpeggio" — click the suggestion below to dispatch real commands.`,
      },
    ]);
    setDraft('');
  }

  return (
    <section className="agent-panel">
      <h2>Agent</h2>
      <div className="agent-modes">
        {AGENT_MODES.map((m) => (
          <button key={m.id} className={`agent-mode${m.id === mode ? ' active' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="agent-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`agent-bubble ${msg.role}`}>
            <span className="role">{msg.role}</span>
            {msg.text}
          </div>
        ))}
      </div>
      {onTryDemo && (
        <div className="agent-suggestions">
          <button className="agent-suggestion" onClick={onTryDemo}>
            Add a C major arpeggio
          </button>
          <button className="agent-suggestion" onClick={() => send('explain the current chord progression')}>
            Explain the progression
          </button>
          <button className="agent-suggestion" onClick={() => send('suggest an arrangement for strings')}>
            Arrange for strings
          </button>
        </div>
      )}
      <form
        className="agent-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask the ${mode} agent...`}
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
