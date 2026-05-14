import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { format } from 'date-fns';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const load = () => api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  if (loading) return <div style={styles.center}><div className="spinner" /></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Projects</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Project</button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {['all', 'active', 'completed', 'archived'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={filter === f ? styles.filterActive : styles.filter}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="icon">◈</div>
          <h3>No projects found</h3>
          <p>Create your first project to get started</p>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => setShowNew(true)}>+ New Project</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={styles.projCard}>
                <div style={styles.projHeader}>
                  <div style={styles.projIcon}>{p.name[0].toUpperCase()}</div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
                <h3 style={styles.projName}>{p.name}</h3>
                {p.description && <p style={styles.projDesc}>{p.description}</p>}
                <div style={styles.projMeta}>
                  <span>👤 {p.owner_name}</span>
                  <span>📋 {p.task_count} tasks</span>
                  <span>👥 {p.member_count}</span>
                </div>
                <div style={styles.projFooter}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Created {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={(p) => { setShowNew(false); navigate(`/projects/${p.id}`); }} />}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      onCreated(res.data.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Project</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Awesome Project" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this project about?" rows={3} style={{ resize: 'vertical' }} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  filters: { display: 'flex', gap: 8, marginBottom: 24 },
  filter: { padding: '6px 16px', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border2)', borderRadius: 20, fontWeight: 600, fontSize: 13 },
  filterActive: { padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', borderRadius: 20, fontWeight: 600, fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  projCard: { cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', ':hover': { transform: 'translateY(-2px)' } },
  projHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  projIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
    color: '#fff', fontWeight: 800, fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  projName: { fontWeight: 700, fontSize: 16, marginBottom: 6 },
  projDesc: { color: 'var(--text3)', fontSize: 13, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  projMeta: { display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)', marginBottom: 12 },
  projFooter: { borderTop: '1px solid var(--border)', paddingTop: 10 },
};
