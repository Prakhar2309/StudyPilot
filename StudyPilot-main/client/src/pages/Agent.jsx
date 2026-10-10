import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Zap, RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Wrench } from 'lucide-react';
import { agentApi } from '../api/client';

const SUGGESTED_PROMPTS = [
  'Plan my study schedule for the next 3 days',
  'Which assignments should I finish first?',
  'I missed yesterday\'s study session. Revise my plan.',
  'Show my academic progress summary',
  'Mark my DBMS Assignment as completed',
  'Create a task: Physics Lab Report due in 3 days',
];

function MarkdownText({ text }) {
  // Simple markdown renderer
  const lines = text.split('\n');
  return (
    <div className="markdown-content">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.4rem 0 0.2rem' }}>{line.slice(4)}</h3>;
        if (line.startsWith('> ')) return <blockquote key={i}>{formatInline(line.slice(2))}</blockquote>;
        if (line.startsWith('• ') || line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', margin: '0.15rem 0' }}>• {formatInline(line.slice(2))}</div>;
        if (/^\d+\. /.test(line)) return <div key={i} style={{ paddingLeft: '1rem', margin: '0.15rem 0' }}>{formatInline(line)}</div>;
        if (line === '') return <br key={i} />;
        return <p key={i} style={{ margin: '0.15rem 0' }}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const first = [boldMatch, codeMatch].filter(Boolean).sort((a, b) => a.index - b.index)[0];
    if (!first) { parts.push(<span key={key++}>{remaining}</span>); break; }
    if (first.index > 0) parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
    if (first === boldMatch) parts.push(<strong key={key++}>{first[1]}</strong>);
    else parts.push(<code key={key++}>{first[1]}</code>);
    remaining = remaining.slice(first.index + first[0].length);
  }
  return parts;
}

function TraceStep({ step, index }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcon = {
    success: <CheckCircle size={14} color="#22c55e" />,
    error: <XCircle size={14} color="#ef4444" />,
    warning: <Clock size={14} color="#f59e0b" />,
    running: <RefreshCw size={14} color="#3b82f6" className="animate-spin" />,
  }[step.status] || <Clock size={14} />;

  return (
    <div className={`trace-step trace-${step.status}`} style={{ flexDirection: 'column', gap: '4px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#a78bfa', fontWeight: 500 }}>
          {step.tool}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Step {step.step}</span>
        <span className={`badge badge-${step.status === 'success' ? 'completed' : step.status === 'error' ? 'overdue' : 'scheduled'}`} style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
          {step.status}
        </span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      {expanded && step.output && (
        <pre style={{
          marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-base)',
          borderRadius: '6px', fontSize: '0.7rem', overflow: 'auto', maxHeight: '200px',
          color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace",
        }}>
          {JSON.stringify(step.output, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Message({ msg }) {
  const [showTrace, setShowTrace] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: isUser ? 'flex-end' : 'flex-start' }} className="animate-fade-in">
      {/* Avatar + bubble */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: isUser ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--bg-card)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isUser ? <User size={14} color="white" /> : <Bot size={14} color="var(--accent-violet-light)" />}
        </div>
        <div className={isUser ? 'chat-user' : 'chat-agent'}>
          {isUser ? (
            <span style={{ fontSize: '0.875rem' }}>{msg.content}</span>
          ) : (
            <MarkdownText text={msg.content} />
          )}
        </div>
      </div>

      {/* Tool trace */}
      {!isUser && msg.trace && msg.trace.length > 0 && (
        <div style={{ marginLeft: 38, width: '100%', maxWidth: '90%' }}>
          <button
            onClick={() => setShowTrace(!showTrace)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', gap: '4px' }}
          >
            <Wrench size={12} />
            {msg.trace.length} tool{msg.trace.length > 1 ? 's' : ''} used
            {showTrace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {msg.isDemo && <span className="demo-banner" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>Demo</span>}
          </button>
          {showTrace && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
              {msg.trace.map((step, i) => <TraceStep key={i} step={step} index={i} />)}
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: isUser ? 0 : 38, marginRight: isUser ? 38 : 0 }}>
        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

export default function Agent() {
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: '👋 **Hello! I\'m StudyPilot AI**, your autonomous study planning assistant.\n\nI can help you:\n• **Plan** personalized study schedules\n• **Prioritize** your assignments by urgency\n• **Track** your academic progress\n• **Revise** plans when things change\n\nTry one of the suggested prompts below or type your own request!',
      time: new Date().toISOString(),
      trace: [],
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentMode, setAgentMode] = useState('Demo');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    agentApi.getStatus().then(r => setAgentMode(r.data?.mode || 'Demo')).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, time: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await agentApi.chat(msg);
      const d = res.data;
      setMessages(prev => [...prev, {
        role: 'agent',
        content: d.response,
        trace: d.trace || [],
        isDemo: d.is_demo,
        model: d.model,
        time: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: `❌ **Error:** ${err.message}\n\nPlease try again or check the server connection.`,
        time: new Date().toISOString(),
        trace: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">AI Study Agent</h1>
          <p className="section-subtitle">Natural language interface for your study planning</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.75rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '0.8rem',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: agentMode.includes('Demo') ? '#f59e0b' : '#22c55e' }} />
            {agentMode}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMessages(msgs => [msgs[0]])}
            title="Clear chat"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', background: 'var(--bg-surface)',
        border: '1px solid var(--border)', borderRadius: '16px',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="animate-fade-in">
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="var(--accent-violet-light)" />
            </div>
            <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-violet-light)',
                  animation: `pulse-glow 1.2s ease-in-out ${delay}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {SUGGESTED_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            className="textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything — plan schedule, check progress, mark tasks complete..."
            rows={2}
            style={{ resize: 'none', paddingRight: '3rem' }}
            id="agent-chat-input"
            disabled={loading}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          id="agent-send-btn"
          style={{ height: '70px', flexShrink: 0 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
