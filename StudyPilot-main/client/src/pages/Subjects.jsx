import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, BookOpen, X, Check } from 'lucide-react';
import { subjectsApi, topicsApi } from '../api/client';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function SubjectForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [color, setColor] = useState(initial?.color || '#6366f1');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await subjectsApi.update(initial.id, { name, description: desc, color });
        toast.success('Subject updated');
      } else {
        await subjectsApi.create({ name, description: desc, color });
        toast.success('Subject created');
      }
      onSave();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label className="label">Subject Name *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Structures" required />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description..." />
      </div>
      <div>
        <label className="label">Color</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '2px solid transparent',
              cursor: 'pointer', outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Create'}</button>
      </div>
    </form>
  );
}

function TopicForm({ subjectId, initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty || 'medium');
  const [hours, setHours] = useState(initial?.estimated_hours || 2);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await topicsApi.update(initial.id, { subject_id: subjectId, title, difficulty, estimated_hours: Number(hours), completed: initial.completed });
        toast.success('Topic updated');
      } else {
        await topicsApi.create({ subject_id: subjectId, title, difficulty, estimated_hours: Number(hours) });
        toast.success('Topic added');
      }
      onSave();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic title *" required />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <select className="select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <input className="input" type="number" min={0.5} max={50} step={0.5} value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours" />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><X size={12} /> Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}><Check size={12} /> {saving ? '...' : 'Save'}</button>
      </div>
    </form>
  );
}

function SubjectCard({ subject, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [topics, setTopics] = useState([]);
  const [addingTopic, setAddingTopic] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTopics = async () => {
    if (!expanded) return;
    setLoading(true);
    try {
      const r = await topicsApi.getAll(subject.id);
      setTopics(r.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTopics(); }, [expanded]);

  const toggleComplete = async (topic) => {
    try {
      await topicsApi.setComplete(topic.id, !topic.completed);
      toast.success(topic.completed ? 'Marked incomplete' : 'Marked complete!');
      loadTopics();
    } catch (err) { toast.error(err.message); }
  };

  const deleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await topicsApi.delete(id);
      toast.success('Topic deleted');
      loadTopics();
    } catch (err) { toast.error(err.message); }
  };

  const completedCount = topics.filter(t => t.completed).length;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Subject header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px',
          cursor: 'pointer', background: 'var(--bg-card)',
          borderLeft: `4px solid ${subject.color}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color={subject.color} />
            {subject.name}
          </div>
          {subject.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subject.description}</div>}
        </div>
        {topics.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{completedCount}/{topics.length} topics</div>
        )}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onEdit(subject); }} id={`edit-subject-${subject.id}`}>
            <Edit2 size={13} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(subject.id); }} id={`delete-subject-${subject.id}`}>
            <Trash2 size={13} />
          </button>
        </div>
        {expanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
      </div>

      {/* Topics list */}
      {expanded && (
        <div style={{ padding: '0.75rem 1.25rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ height: 60 }} className="skeleton" />
          ) : (
            topics.map(topic => (
              editingTopic?.id === topic.id ? (
                <TopicForm key={topic.id} subjectId={subject.id} initial={topic}
                  onSave={() => { setEditingTopic(null); loadTopics(); }}
                  onCancel={() => setEditingTopic(null)} />
              ) : (
                <div key={topic.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0.75rem',
                  borderRadius: '8px', background: 'var(--bg-elevated)',
                  opacity: topic.completed ? 0.7 : 1,
                }}>
                  <button
                    onClick={() => toggleComplete(topic)}
                    style={{
                      width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
                      background: topic.completed ? '#22c55e' : 'transparent',
                      border: `2px solid ${topic.completed ? '#22c55e' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {topic.completed && <Check size={11} color="white" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: topic.completed ? 'line-through' : 'none', color: topic.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {topic.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                      <span className={`badge badge-${topic.difficulty === 'medium' ? 'medium-diff' : topic.difficulty}`}>{topic.difficulty}</span>
                      <span>{topic.estimated_hours}h est.</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingTopic(topic)}><Edit2 size={12} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTopic(topic.id)}><Trash2 size={12} /></button>
                </div>
              )
            ))
          )}
          {addingTopic ? (
            <TopicForm subjectId={subject.id}
              onSave={() => { setAddingTopic(false); loadTopics(); }}
              onCancel={() => setAddingTopic(false)} />
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setAddingTopic(true)} style={{ alignSelf: 'flex-start' }}>
              <Plus size={13} /> Add Topic
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await subjectsApi.getAll();
      setSubjects(r.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
      await subjectsApi.delete(id);
      toast.success('Subject deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="section-title">Subjects & Topics</h1>
          <p className="section-subtitle">Manage your subjects and track topic completion</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSubject(null); setShowForm(true); }} id="add-subject-btn">
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {(showForm || editingSubject) && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingSubject(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
            <SubjectForm
              initial={editingSubject}
              onSave={() => { setShowForm(false); setEditingSubject(null); load(); }}
              onCancel={() => { setShowForm(false); setEditingSubject(null); }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 70 }} className="skeleton" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">No subjects yet</div>
          <div className="empty-state-sub">Add your first subject to get started</div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Subject
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subjects.map(s => (
            <SubjectCard
              key={s.id} subject={s}
              onEdit={sub => { setEditingSubject(sub); setShowForm(false); }}
              onDelete={deleteSubject}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
