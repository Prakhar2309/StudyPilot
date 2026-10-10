import { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import { progressApi } from '../api/client';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function Progress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    progressApi.getSummary().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{height:300}} className="skeleton"/>;
  if (!data) return <div className="empty-state"><div className="empty-state-text">Failed to load progress</div></div>;

  const { tasks, topics, sessions, subject_progress, upcoming_deadlines } = data;

  const subjectChartData = subject_progress.map(s => ({
    name: s.name.split(' ')[0],
    fullName: s.name,
    value: s.total_topics > 0 ? Math.round(s.completed_topics / s.total_topics * 100) : 0,
    color: s.color,
    completed: s.completed_topics,
    total: s.total_topics,
  }));

  const StatBig = ({ label, value, sub, color, icon: Icon }) => (
    <div className="stat-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'2rem', fontWeight:800, color }}>{value}</div>
        <div style={{ width:44, height:44, borderRadius:'12px', background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={22} color={color}/>
        </div>
      </div>
      <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }} className="animate-fade-in">
      <div>
        <h1 className="section-title">Academic Progress</h1>
        <p className="section-subtitle">Real-time statistics from your study data</p>
      </div>

      {/* Top stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>
        <StatBig label="Task Completion" value={`${tasks.completion_percentage}%`} sub={`${tasks.completed}/${tasks.total} tasks`} color="#a78bfa" icon={CheckCircle}/>
        <StatBig label="Topics Covered" value={`${topics.completion_percentage}%`} sub={`${topics.completed}/${topics.total} topics`} color="#34d399" icon={BookOpen}/>
        <StatBig label="Hours Studied" value={`${sessions.hours_studied}h`} sub={`${sessions.completed} sessions completed`} color="#60a5fa" icon={Clock}/>
        <StatBig label="Overdue Tasks" value={tasks.overdue} sub={tasks.overdue > 0 ? 'Needs attention!' : 'All on track ✅'} color={tasks.overdue > 0 ? '#f87171' : '#34d399'} icon={AlertTriangle}/>
      </div>

      {/* Progress bars for tasks & topics */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        <div className="card-elevated">
          <div style={{ fontWeight:600, marginBottom:'1rem' }}>Task Progress</div>
          <div style={{ fontSize:'2.5rem', fontWeight:800, color:'#a78bfa', marginBottom:'0.5rem' }}>{tasks.completion_percentage}%</div>
          <div className="progress-bar" style={{height:'12px', marginBottom:'1rem'}}>
            <div className="progress-fill" style={{width:`${tasks.completion_percentage}%`, background:'linear-gradient(135deg,#7c3aed,#2563eb)'}}/>
          </div>
          <div style={{ display:'flex', gap:'1rem', fontSize:'0.8rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{width:8,height:8,borderRadius:'50%',background:'#34d399'}}/> {tasks.completed} done</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{width:8,height:8,borderRadius:'50%',background:'#60a5fa'}}/> {tasks.in_progress} active</div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{width:8,height:8,borderRadius:'50%',background:'#6e7681'}}/> {tasks.pending} pending</div>
          </div>
        </div>
        <div className="card-elevated">
          <div style={{ fontWeight:600, marginBottom:'1rem' }}>Topic Coverage</div>
          <div style={{ fontSize:'2.5rem', fontWeight:800, color:'#34d399', marginBottom:'0.5rem' }}>{topics.completion_percentage}%</div>
          <div className="progress-bar" style={{height:'12px', marginBottom:'1rem'}}>
            <div className="progress-fill" style={{width:`${topics.completion_percentage}%`, background:'linear-gradient(135deg,#059669,#10b981)'}}/>
          </div>
          <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{topics.completed} of {topics.total} topics completed</div>
          <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'4px' }}>{topics.completed_hours?.toFixed(1) || 0}h / {topics.total_hours?.toFixed(1) || 0}h estimated</div>
        </div>
      </div>

      {/* Per-subject progress */}
      <div className="card-elevated">
        <div style={{ fontWeight:600, marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'8px' }}>
          <TrendingUp size={18} color="var(--accent-violet-light)"/> Subject-wise Progress
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {subject_progress.map(s => {
            const topicPct = s.total_topics > 0 ? Math.round(s.completed_topics/s.total_topics*100) : 0;
            const taskPct = s.total_tasks > 0 ? Math.round(s.completed_tasks/s.total_tasks*100) : 0;
            return (
              <div key={s.id}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', fontWeight:500, fontSize:'0.875rem' }}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                    {s.name}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', gap:'1rem' }}>
                    <span>{s.completed_topics}/{s.total_topics} topics</span>
                    <span>{s.completed_tasks}/{s.total_tasks} tasks</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  <div className="progress-bar" style={{flex:1}}>
                    <div className="progress-fill" style={{width:`${topicPct}%`, background:s.color}}/>
                  </div>
                  <span style={{fontSize:'0.75rem', color:'var(--text-muted)', minWidth:36}}>{topicPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming deadlines */}
      {upcoming_deadlines.length > 0 && (
        <div className="card-elevated">
          <div style={{ fontWeight:600, marginBottom:'1rem' }}>⏰ Upcoming Deadlines</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {upcoming_deadlines.map(t => {
              const days = Math.ceil((new Date(t.deadline) - new Date()) / 86400000);
              const color = days <= 1 ? '#f87171' : days <= 3 ? '#fb923c' : '#fbbf24';
              return (
                <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.625rem 0.75rem', borderRadius:'8px', background:'var(--bg-elevated)', border:`1px solid ${color}20` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:t.subject_color||'#6366f1'}}/>
                    <div>
                      <div style={{fontWeight:500,fontSize:'0.875rem'}}>{t.title}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{t.subject_name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{fontSize:'0.875rem',fontWeight:600,color}}>{days <= 0 ? 'OVERDUE' : `${days}d`}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{t.deadline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session stats */}
      <div className="card-elevated">
        <div style={{ fontWeight:600, marginBottom:'1rem' }}>📊 Study Session Stats</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'1rem' }}>
          {[
            { label:'Total Sessions', value: sessions.total, color:'#60a5fa' },
            { label:'Completed', value: sessions.completed, color:'#34d399' },
            { label:'Missed', value: sessions.missed, color:'#f87171' },
            { label:'Upcoming', value: sessions.upcoming, color:'#a78bfa' },
          ].map(({label,value,color}) => (
            <div key={label} style={{ textAlign:'center', padding:'0.875rem', background:'var(--bg-elevated)', borderRadius:'10px' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:700, color }}>{value}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
