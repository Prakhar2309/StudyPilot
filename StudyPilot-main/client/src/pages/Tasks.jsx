import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Filter, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { tasksApi, subjectsApi } from '../api/client';
import toast from 'react-hot-toast';
import { format, differenceInDays, parseISO } from 'date-fns';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function TaskForm({ initial, subjects, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    subject_id: initial?.subject_id || subjects[0]?.id || '',
    deadline: initial?.deadline || '',
    priority: initial?.priority || 'medium',
    estimated_hours: initial?.estimated_hours || 2,
    status: initial?.status || 'pending',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await tasksApi.update(initial.id, { ...form, estimated_hours: Number(form.estimated_hours) });
        toast.success('Task updated');
      } else {
        await tasksApi.create({ ...form, estimated_hours: Number(form.estimated_hours) });
        toast.success('Task created');
      }
      onSave();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label className="label">Title *</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label className="label">Subject *</label>
          <select className="select" value={form.subject_id} onChange={e => set('subject_id', e.target.value)} required>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Deadline *</label>
          <input className="input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} required />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="label">Estimated Hours</label>
          <input className="input" type="number" min={0.5} max={100} step={0.5} value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} />
        </div>
      </div>
      {initial && (
        <div>
          <label className="label">Status</label>
          <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}
      <div>
        <label className="label">Notes</label>
        <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={2} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Create'}</button>
      </div>
    </form>
  );
}

function TaskRow({ task, onEdit, onDelete, onStatusChange }) {
  const days = differenceInDays(parseISO(task.deadline), new Date());
  const isOverdue = days < 0 && task.status !== 'completed';

  return (
    <tr style={{ opacity: task.status === 'completed' ? 0.6 : 1 }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.subject_color || '#6366f1', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
              {task.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.subject_name}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.875rem' }}>{task.deadline}</span>
          {isOverdue && <span className="badge badge-overdue">OVERDUE</span>}
          {!isOverdue && days === 0 && <span className="badge badge-high">TODAY</span>}
        </div>
      </td>
      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
      <td>
        <select
          className="select"
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{task.estimated_hours}h</td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)} id={`edit-task-${task.id}`}><Edit2 size={13} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(task.id)} id={`delete-task-${task.id}`}><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', subject_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([tasksApi.getAll(filters), subjectsApi.getAll()]);
      setTasks(t.data || []);
      setSubjects(s.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try { await tasksApi.delete(id); toast.success('Task deleted'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const updateStatus = async (id, status) => {
    try { await tasksApi.updateStatus(id, status); toast.success('Status updated'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.deadline < new Date().toISOString().split('T')[0]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Assignments & Tasks</h1>
          <p className="section-subtitle">Track, prioritize, and complete your academic tasks</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowForm(true); }} id="add-task-btn">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', count: pendingCount, color: '#8b949e', icon: Clock },
          { label: 'In Progress', count: inProgressCount, color: '#60a5fa', icon: AlertTriangle },
          { label: 'Completed', count: completedCount, color: '#34d399', icon: CheckCircle },
          { label: 'Overdue', count: overdueCount, color: '#f87171', icon: AlertTriangle },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.75rem',
            background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '8px',
            fontSize: '0.8rem', fontWeight: 600, color,
          }}>
            <Icon size={13} /> {count} {label}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={16} color="var(--text-muted)" />
        <select className="select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="select" value={filters.subject_id} onChange={e => setFilters(f => ({ ...f, subject_id: e.target.value }))} style={{ width: 'auto' }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(filters.status || filters.priority || filters.subject_id) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', subject_id: '' })}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Form Modal */}
      {(showForm || editingTask) && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingTask(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
            <TaskForm
              initial={editingTask}
              subjects={subjects}
              onSave={() => { setShowForm(false); setEditingTask(null); load(); }}
              onCancel={() => { setShowForm(false); setEditingTask(null); }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ height: 200 }} className="skeleton" />
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">No tasks found</div>
          <div className="empty-state-sub">Add a task or clear filters</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Est.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    onEdit={setEditingTask}
                    onDelete={deleteTask}
                    onStatusChange={updateStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
