import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { agentApi } from '../api/client';
import { format, parseISO } from 'date-fns';

function RunCard({ run }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = { success:'#34d399', partial:'#f59e0b', error:'#f87171' }[run.status] || '#9ca3af';
  const StatusIcon = run.status === 'success' ? CheckCircle : run.status === 'error' ? XCircle : Clock;

  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding:'0.875rem 1rem', display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', borderLeft:`3px solid ${statusColor}` }}>
        <StatusIcon size={16} color={statusColor} style={{ flexShrink:0, marginTop:2 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:'0.875rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{run.user_request}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'2px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <span>{format(parseISO(run.created_at), 'MMM d HH:mm')}</span>
            <span>•</span>
            <span>{Array.isArray(run.tools_used) ? run.tools_used.length : 0} tools</span>
            {Array.isArray(run.tools_used) && run.tools_used.length > 0 && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'#a78bfa' }}>
                {run.tools_used.slice(0,3).join(', ')}{run.tools_used.length > 3 ? '...' : ''}
              </span>
            )}
          </div>
        </div>
        <span className={`badge badge-${run.status === 'success' ? 'completed' : run.status === 'error' ? 'overdue' : 'scheduled'}`}>{run.status}</span>
        {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
      </div>

      {expanded && (
        <div style={{ padding:'0.75rem 1rem', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'0.5rem', background:'var(--bg-elevated)' }}>
          {run.outcome && (
            <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', fontStyle:'italic', padding:'0.5rem', background:'var(--bg-card)', borderRadius:'6px' }}>
              {run.outcome}
            </div>
          )}
          {Array.isArray(run.execution_trace) && run.execution_trace.length > 0 && (
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'4px' }}>
                <Wrench size={12}/> Execution Trace
              </div>
              {run.execution_trace.map((step, i) => {
                const stepColor = { success:'var(--success)', error:'var(--error)', warning:'var(--warning)', running:'var(--info)' }[step.status] || '#8b949e';
                return (
                  <div key={i} className={`trace-step trace-${step.status}`} style={{ marginBottom:'4px' }}>
                    <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>#{step.step}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.8rem', color:'#a78bfa' }}>{step.tool}</span>
                    <span className={`badge badge-${step.status === 'success' ? 'completed' : step.status === 'error' ? 'overdue' : 'scheduled'}`} style={{ marginLeft:'auto', fontSize:'0.65rem' }}>
                      {step.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentActivity() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState(null);

  useEffect(() => {
    Promise.all([agentApi.getRuns(30), agentApi.getStatus()])
      .then(([r, s]) => { setRuns(r.data || []); setAgentStatus(s.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const successCount = runs.filter(r => r.status === 'success').length;
  const errorCount = runs.filter(r => r.status === 'error').length;
  const toolsUsed = [...new Set(runs.flatMap(r => Array.isArray(r.tools_used) ? r.tools_used : []))];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }} className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 className="section-title">Agent Activity</h1>
          <p className="section-subtitle">History of AI agent interactions and tool executions</p>
        </div>
        {agentStatus && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0.5rem 0.875rem', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'0.8rem' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: agentStatus.is_demo ? '#f59e0b' : '#22c55e' }}/>
            {agentStatus.mode} — {agentStatus.model}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'1rem' }}>
        {[
          { label:'Total Agent Runs', value: runs.length, color:'#60a5fa' },
          { label:'Successful', value: successCount, color:'#34d399' },
          { label:'Failed', value: errorCount, color:'#f87171' },
          { label:'Unique Tools Used', value: toolsUsed.length, color:'#a78bfa' },
        ].map(({label,value,color}) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize:'1.75rem', fontWeight:800, color }}>{value}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', fontWeight:500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tools used */}
      {toolsUsed.length > 0 && (
        <div className="card-elevated">
          <div style={{ fontWeight:600, marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'6px' }}>
            <Wrench size={16}/> Tools Used
          </div>
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
            {toolsUsed.map(t => (
              <span key={t} style={{ padding:'0.25rem 0.625rem', background:'rgba(124,58,237,0.15)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.3)', borderRadius:'6px', fontSize:'0.75rem', fontFamily:"'JetBrains Mono',monospace" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Run history */}
      <div>
        <div style={{ fontWeight:600, marginBottom:'1rem', fontSize:'1rem' }}>Recent Agent Runs</div>
        {loading ? <div style={{height:200}} className="skeleton"/> :
         runs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <div className="empty-state-text">No agent runs yet</div>
            <div className="empty-state-sub">Use the AI Agent tab to start a conversation</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {runs.map(r => <RunCard key={r.id} run={r}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
