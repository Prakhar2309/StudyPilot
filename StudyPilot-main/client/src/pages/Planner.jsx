import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, RefreshCw, Bot } from 'lucide-react';
import { sessionsApi } from '../api/client';
import { agentApi } from '../api/client';
import toast from 'react-hot-toast';
import { format, parseISO, addDays } from 'date-fns';

function SessionCard({ session, onStatusChange }) {
  const colors = { scheduled: '#60a5fa', completed: '#34d399', missed: '#f87171', skipped: '#9ca3af' };
  const color = colors[session.status] || '#9ca3af';
  return (
    <div style={{ display:'flex', gap:'12px', alignItems:'flex-start', padding:'0.875rem 1rem', borderRadius:'10px', background:'var(--bg-card)', border:'1px solid var(--border)', borderLeft:`4px solid ${color}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{session.title}</div>
        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'2px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <span>🕐 {session.start_time}</span>
          <span>⏱ {Math.round(session.duration_minutes/60*10)/10}h</span>
          <span style={{ color: session.subject_color || '#6366f1' }}>📚 {session.subject_name}</span>
        </div>
      </div>
      <select value={session.status} onChange={e => onStatusChange(session.id, e.target.value)}
        className="select" style={{ padding:'0.25rem 0.5rem', fontSize:'0.8rem', width:'auto' }}>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="missed">Missed</option>
        <option value="skipped">Skipped</option>
      </select>
    </div>
  );
}

export default function Planner() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await sessionsApi.getAll({ date: selectedDate });
      setSessions(r.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedDate]);

  const changeStatus = async (id, status) => {
    try { await sessionsApi.updateStatus(id, status); toast.success('Updated'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const r = await agentApi.chat('Plan my study schedule for the next 3 days');
      toast.success(`Plan generated! ${r.data?.response?.slice(0,80)}...`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const dates = Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i - 1);
    return d.toISOString().split('T')[0];
  });

  const grouped = sessions.reduce((g, s) => { (g[s.session_date] = g[s.session_date] || []).push(s); return g; }, {});

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }} className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 className="section-title">Study Planner</h1>
          <p className="section-subtitle">View and manage your scheduled study sessions</p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14}/> Refresh</button>
          <button className="btn btn-primary" onClick={generatePlan} disabled={generating}>
            <Bot size={14}/> {generating ? 'Generating...' : 'AI Generate Plan'}
          </button>
        </div>
      </div>

      {/* Date tabs */}
      <div style={{ display:'flex', gap:'0.5rem', overflowX:'auto', paddingBottom:'4px' }}>
        {dates.map(d => {
          const isToday = d === new Date().toISOString().split('T')[0];
          const isSelected = d === selectedDate;
          const sessionCount = sessions.filter(s => s.session_date === d).length;
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              style={{ padding:'0.5rem 0.875rem', borderRadius:'8px', border:`1px solid ${isSelected ? 'var(--accent-violet)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
                color: isSelected ? 'var(--accent-violet-light)' : 'var(--text-secondary)',
                cursor:'pointer', whiteSpace:'nowrap', fontSize:'0.8rem', fontWeight: isSelected ? 600 : 400 }}>
              {isToday ? 'Today' : format(parseISO(d), 'EEE d MMM')}
              {sessionCount > 0 && <span style={{ marginLeft:'6px', background: isSelected ? 'var(--accent-violet)' : 'var(--border)', color:'white', borderRadius:'999px', padding:'0 6px', fontSize:'0.7rem' }}>{sessionCount}</span>}
            </button>
          );
        })}
      </div>

      {/* Sessions for selected date */}
      <div className="card-elevated">
        <div style={{ fontWeight:600, marginBottom:'1rem', display:'flex', alignItems:'center', gap:'8px' }}>
          <Calendar size={18} color="var(--accent-blue-light)"/> {format(parseISO(selectedDate), 'EEEE, MMMM d')}
          {selectedDate === new Date().toISOString().split('T')[0] && <span className="badge badge-scheduled">Today</span>}
        </div>
        {loading ? <div style={{height:100}} className="skeleton"/> :
         sessions.filter(s => s.session_date === selectedDate).length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">No sessions for this date</div>
            <div className="empty-state-sub">Use <strong>AI Generate Plan</strong> to create a schedule</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {sessions.filter(s => s.session_date === selectedDate)
              .sort((a,b) => a.start_time.localeCompare(b.start_time))
              .map(s => <SessionCard key={s.id} session={s} onStatusChange={changeStatus}/>)}
          </div>
        )}
      </div>

      {/* All upcoming sessions summary */}
      <div className="card-elevated">
        <div style={{ fontWeight:600, marginBottom:'1rem' }}>📋 Upcoming Sessions (Next 7 Days)</div>
        {loading ? <div style={{height:80}} className="skeleton"/> : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {sessions.filter(s => s.status === 'scheduled' && s.session_date >= new Date().toISOString().split('T')[0])
              .sort((a,b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time))
              .slice(0,8).map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0.75rem', borderRadius:'8px', background:'var(--bg-elevated)', fontSize:'0.8rem' }}>
                <span style={{ color: s.subject_color }}>{s.subject_name}</span>
                <span style={{ flex:1, marginLeft:'0.75rem', fontWeight:500 }}>{s.title}</span>
                <span style={{ color:'var(--text-muted)', marginRight:'0.75rem' }}>{s.session_date} {s.start_time}</span>
                <span style={{ color:'var(--text-muted)' }}>{Math.round(s.duration_minutes/60*10)/10}h</span>
              </div>
            ))}
            {sessions.filter(s => s.status === 'scheduled').length === 0 && (
              <div style={{ color:'var(--text-muted)', fontSize:'0.875rem', textAlign:'center', padding:'1rem' }}>No upcoming sessions. Generate a plan!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
