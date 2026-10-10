import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp,
  Calendar, Zap, BookOpen, Target, ArrowRight, Flame
} from 'lucide-react';
import { progressApi, sessionsApi, tasksApi } from '../api/client';
import { format, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={`stat-value`} style={{ color }}>{value}</div>
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function DeadlineItem({ task }) {
  const days = differenceInDays(parseISO(task.deadline), new Date());
  const isOverdue = days < 0;
  const urgency = isOverdue ? 'OVERDUE' : days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days}d`;
  const urgencyColor = isOverdue ? '#ef4444' : days <= 1 ? '#f59e0b' : days <= 3 ? '#f97316' : '#8b949e';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.65rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)',
      border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: task.subject_color || '#6366f1', flexShrink: 0
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.subject_name}</div>
        </div>
      </div>
      <div style={{
        fontSize: '0.75rem', fontWeight: 700, color: urgencyColor,
        background: `${urgencyColor}15`, padding: '2px 8px', borderRadius: '999px',
        border: `1px solid ${urgencyColor}30`, flexShrink: 0, marginLeft: '0.5rem'
      }}>
        {urgency}
      </div>
    </div>
  );
}

function SessionItem({ session }) {
  const statusColor = {
    scheduled: '#60a5fa', completed: '#34d399', missed: '#f87171', skipped: '#9ca3af'
  }[session.status] || '#9ca3af';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '0.65rem 0.75rem', borderRadius: '8px', background: 'var(--bg-elevated)',
      borderLeft: `3px solid ${statusColor}`,
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{session.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {session.start_time} · {Math.round(session.duration_minutes / 60 * 10) / 10}h · {session.subject_name}
        </div>
      </div>
      <span className={`badge badge-${session.status}`} style={{ marginLeft: 'auto', flexShrink: 0 }}>
        {session.status}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [progress, setProgress] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      progressApi.getSummary(),
      sessionsApi.getToday(),
      tasksApi.getAll({ status: 'pending' }),
    ]).then(([p, s, t]) => {
      setProgress(p.data);
      setTodaySessions(s.data || []);
      const sorted = (t.data || []).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      setUrgentTasks(sorted.slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ height: 80 }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 100 }} className="skeleton" />)}
        </div>
      </div>
    );
  }

  const stats = progress?.tasks;
  const topics = progress?.topics;
  const sessions = progress?.sessions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title">{greeting}! 👋</h1>
          <p className="section-subtitle">{format(today, 'EEEE, MMMM d, yyyy')} — Here's your study overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/agent" className="btn btn-primary">
            <Zap size={16} /> Ask AI Agent
          </Link>
          <Link to="/planner" className="btn btn-secondary">
            <Calendar size={16} /> Planner
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard icon={CheckSquare} label="Tasks Completed" value={`${stats?.completed || 0}/${stats?.total || 0}`} color="#34d399" sub={`${stats?.completion_percentage || 0}% done`} />
        <StatCard icon={BookOpen} label="Topics Covered" value={`${topics?.completed || 0}/${topics?.total || 0}`} color="#60a5fa" sub={`${topics?.completion_percentage || 0}% covered`} />
        <StatCard icon={Clock} label="Hours Studied" value={`${sessions?.hours_studied || 0}h`} color="#a78bfa" sub="total logged" />
        <StatCard icon={AlertTriangle} label="Overdue Tasks" value={stats?.overdue || 0} color={stats?.overdue > 0 ? '#f87171' : '#34d399'} sub={stats?.overdue > 0 ? 'Needs attention!' : 'All on track'} />
      </div>

      {/* Overall progress bar */}
      <div className="card-elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600 }}>Overall Academic Progress</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa' }}>{stats?.completion_percentage || 0}%</div>
        </div>
        <div className="progress-bar" style={{ height: '10px', marginBottom: '0.75rem' }}>
          <div className="progress-fill" style={{
            width: `${stats?.completion_percentage || 0}%`,
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>✅ {stats?.completed || 0} completed</span>
          <span>⏳ {stats?.in_progress || 0} in progress</span>
          <span>📋 {stats?.pending || 0} pending</span>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Today's Sessions */}
        <div className="card-elevated">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--accent-blue-light)" /> Today's Schedule
            </div>
            <Link to="/planner" style={{ fontSize: '0.8rem', color: 'var(--accent-violet-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {todaySessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">No sessions today</div>
              <div className="empty-state-sub">
                <Link to="/agent" style={{ color: 'var(--accent-violet-light)' }}>Ask the AI agent</Link> to plan your schedule
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {todaySessions.slice(0, 4).map(s => <SessionItem key={s.id} session={s} />)}
              {todaySessions.length > 4 && (
                <Link to="/planner" style={{ fontSize: '0.8rem', color: 'var(--accent-violet-light)', textAlign: 'center', padding: '0.5rem' }}>
                  +{todaySessions.length - 4} more sessions
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card-elevated">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="#f87171" /> Upcoming Deadlines
            </div>
            <Link to="/tasks" style={{ fontSize: '0.8rem', color: 'var(--accent-violet-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              All tasks <ArrowRight size={12} />
            </Link>
          </div>
          {urgentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-text">No pending tasks!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {urgentTasks.map(t => <DeadlineItem key={t.id} task={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Subject progress */}
      {progress?.subject_progress?.length > 0 && (
        <div className="card-elevated">
          <div style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="var(--accent-violet-light)" /> Subject Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {progress.subject_progress.map(s => {
              const pct = s.total_topics > 0 ? Math.round(s.completed_topics / s.total_topics * 100) : 0;
              return (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      {s.name}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.completed_topics}/{s.total_topics} topics · {pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card-elevated">
        <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <Link to="/agent" className="btn btn-primary">
            <Zap size={14} /> Plan Schedule
          </Link>
          <Link to="/tasks" className="btn btn-secondary">
            <CheckSquare size={14} /> Add Task
          </Link>
          <Link to="/subjects" className="btn btn-secondary">
            <BookOpen size={14} /> Add Subject
          </Link>
          <Link to="/progress" className="btn btn-secondary">
            <TrendingUp size={14} /> View Progress
          </Link>
        </div>
      </div>
    </div>
  );
}
