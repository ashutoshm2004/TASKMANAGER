import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '' });

  const isAdmin = user.role === 'admin';
  const memberRole = members.find(m => m.id === user.id)?.project_role;
  const canManage = isAdmin || memberRole === 'admin';

  const load = useCallback(async () => {
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get('/auth/users'),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTaskStats(projRes.data.taskStats);
      setTasks(tasksRes.data.tasks);
      setAllUsers(usersRes.data.users);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const loadTasks = async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assignee) params.assignee = filters.assignee;
    const res = await api.get(`/projects/${id}/tasks`, { params });
    setTasks(res.data.tasks);
  };

  useEffect(() => { if (project) loadTasks(); }, [filters]);

  const updateTaskStatus = async (taskId, newStatus) => {
    await api.put(`/projects/${id}/tasks/${taskId}`, { status: newStatus });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    setTasks(ts => ts.filter(t => t.id !== taskId));
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    navigate('/projects');
  };

  if (loading) return <div style={styles.center}><div className="spinner" /></div>;

  const cols = [
    { key: 'todo', label: 'To Do', color: '#64748b' },
    { key: 'in_progress', label: 'In Progress', color: 'var(--primary)' },
    { key: 'done', label: 'Done', color: 'var(--success)' },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/projects" style={{ color: 'var(--text3)', fontSize: 13 }}>← Projects</Link>
          <span style={{ color: 'var(--border2)' }}>/</span>
          <h1 style={styles.title}>{project.name}</h1>
          <span className={`badge badge-${project.status}`}>{project.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>+ Add Task</button>
          {canManage && <button className="btn-secondary" onClick={() => setShowSettings(true)}>⚙ Settings</button>}
        </div>
      </div>

      {project.description && <p style={styles.desc}>{project.description}</p>}

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total', val: taskStats.total || 0, color: 'var(--text2)' },
          { label: 'Todo', val: taskStats.todo || 0, color: '#64748b' },
          { label: 'In Progress', val: taskStats.in_progress || 0, color: 'var(--primary)' },
          { label: 'Done', val: taskStats.done || 0, color: 'var(--success)' },
          { label: 'Overdue', val: taskStats.overdue || 0, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={styles.statChip}>
            <span style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.val}</span>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>{s.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Members avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {members.slice(0, 5).map(m => (
            <div key={m.id} title={m.name} style={styles.avatar}>
              {m.name[0].toUpperCase()}
            </div>
          ))}
          {members.length > 5 && <div style={{ ...styles.avatar, background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11 }}>+{members.length - 5}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['board', 'list', 'members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={tab === t ? styles.tabActive : styles.tab}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(tab === 'board' || tab === 'list') && (
        <div style={styles.filterRow}>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ width: 'auto' }}>
            <option value="">All Status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} style={{ width: 'auto' }}>
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))} style={{ width: 'auto' }}>
            <option value="">All Assignees</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {(filters.status || filters.priority || filters.assignee) && (
            <button className="btn-secondary btn-sm" onClick={() => setFilters({ status: '', priority: '', assignee: '' })}>Clear</button>
          )}
        </div>
      )}

      {/* Board View */}
      {tab === 'board' && (
        <div style={styles.board}>
          {cols.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} style={styles.col}>
                <div style={styles.colHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                  </div>
                  <span style={styles.colCount}>{colTasks.length}</span>
                </div>
                <div style={styles.colBody}>
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => { setEditTask(task); setShowTaskModal(true); }}
                      onDelete={() => deleteTask(task.id)}
                      onStatusChange={updateTaskStatus}
                      cols={cols}
                      canDelete={canManage || task.created_by === user.id}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {tab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="icon">📋</div><h3>No tasks yet</h3>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Assignee</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{task.title}</td>
                    <td style={styles.td}><span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span></td>
                    <td style={styles.td}><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ ...styles.td, color: 'var(--text2)' }}>{task.assignee_name || '—'}</td>
                    <td style={{ ...styles.td, color: task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'var(--danger)' : 'var(--text2)' }}>
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon btn-sm" onClick={() => { setEditTask(task); setShowTaskModal(true); }}>✏</button>
                        {(canManage || task.created_by === user.id) && (
                          <button className="btn-icon btn-sm" onClick={() => deleteTask(task.id)} style={{ color: 'var(--danger)' }}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <MembersTab
          members={members}
          allUsers={allUsers}
          projectId={id}
          canManage={canManage}
          currentUserId={user.id}
          ownerId={project.owner_id}
          onRefresh={load}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={editTask}
          projectId={id}
          members={members}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSaved={() => { load(); setShowTaskModal(false); setEditTask(null); }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onSaved={load}
          onDeleted={deleteProject}
          canDelete={canManage}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, cols, canDelete }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div style={styles.taskCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{task.title}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 12 }} onClick={onEdit}>✏</button>
          {canDelete && <button className="btn-icon" style={{ padding: '2px 6px', fontSize: 12, color: 'var(--danger)' }} onClick={onDelete}>✕</button>}
        </div>
      </div>
      {task.description && <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>{task.description}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.assignee_name && (
          <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={styles.tinyAvatar}>{task.assignee_name[0]}</span>
            {task.assignee_name}
          </span>
        )}
        {task.due_date && (
          <span style={{ fontSize: 11, color: overdue ? 'var(--danger)' : 'var(--text3)', marginLeft: 'auto' }}>
            {overdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
      {/* Quick status move */}
      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
        {cols.filter(c => c.key !== task.status).map(c => (
          <button key={c.key} onClick={() => onStatusChange(task.id, c.key)}
            style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 4, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit' }}>
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ task, projectId, members, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeId: task?.assignee_id || '',
    dueDate: task?.due_date || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        assigneeId: form.assigneeId ? parseInt(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      };
      if (task) {
        await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional details..." style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Assignee</label>
              <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : task ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersTab({ members, allUsers, projectId, canManage, currentUserId, ownerId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');

  const memberIds = new Set(members.map(m => m.id));
  const available = allUsers.filter(u => !memberIds.has(u.id));

  const addMember = async () => {
    if (!selectedUser) return;
    try {
      await api.post(`/projects/${projectId}/members`, { userId: parseInt(selectedUser), role });
      setShowAdd(false); setSelectedUser(''); setRole('member');
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    await api.delete(`/projects/${projectId}/members/${userId}`);
    onRefresh();
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700 }}>Members ({members.length})</h3>
        {canManage && <button className="btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>+ Add Member</button>}
      </div>

      {showAdd && (
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select user...</option>
            {available.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: 120 }}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary btn-sm" onClick={addMember}>Add</button>
          {error && <div className="form-error" style={{ width: '100%' }}>{error}</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map(m => (
          <div key={m.id} style={styles.memberRow}>
            <div style={styles.avatar}>{m.name[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name} {m.id === ownerId && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(owner)</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.email}</div>
            </div>
            <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
            {canManage && m.id !== ownerId && m.id !== currentUserId && (
              <button className="btn-icon" onClick={() => removeMember(m.id)} style={{ color: 'var(--danger)' }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectSettingsModal({ project, onClose, onSaved, onDeleted, canDelete }) {
  const [form, setForm] = useState({ name: project.name, description: project.description || '', status: project.status });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/projects/${project.id}`, form);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Project Settings</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            {canDelete && (
              <button type="button" className="btn-danger btn-sm" onClick={onDeleted}>Delete Project</button>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 28, maxWidth: 1200, margin: '0 auto', width: '100%' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800 },
  desc: { color: 'var(--text3)', fontSize: 14, marginBottom: 16 },
  statsRow: { display: 'flex', gap: 20, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)', marginBottom: 16, flexWrap: 'wrap' },
  statChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  tinyAvatar: { width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16 },
  tab: { padding: '8px 18px', background: 'transparent', color: 'var(--text3)', border: 'none', borderBottom: '2px solid transparent', borderRadius: 0, fontWeight: 600 },
  tabActive: { padding: '8px 18px', background: 'transparent', color: 'var(--primary)', border: 'none', borderBottom: '2px solid var(--primary)', borderRadius: 0, fontWeight: 600 },
  filterRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  board: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' },
  col: { background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' },
  colHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' },
  colCount: { background: 'var(--bg3)', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text2)' },
  colBody: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 },
  taskCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'default' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'var(--bg3)' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: 14 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' },
};
