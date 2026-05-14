import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      const projRes = await api.get('/projects');
      const allProjects = projRes.data.projects;
      setProjects(allProjects);

      const taskArrays = await Promise.all(
        allProjects.map(p =>
          api.get(`/projects/${p.id}/tasks`, { params: { assignee: user.id } })
            .then(r => r.data.tasks.map(t => ({ ...t, project_name: p.name })))
            .catch(() => [])
        )
      );
      setTasks(taskArrays.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLoading(false);
    };
    load();
  }, [user.id]);

  const filtered = filter === 'overdue'
    ? tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done')
    : filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Tasks</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      <div style={styles.filters}>
        {[
          { key: 'all', label: 'All' },
          { key: 'todo', label: 'Todo' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'done', label: 'Done' },
          { key: 'overdue', label: '⚠ Overdue' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={filter === f.key ? styles.filterActive : styles.filter}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="icon">🎉</div>
          <h3>{filter === 'overdue' ? 'No overdue tasks!' : 'No tasks here'}</h3>
          <p>{filter === 'all' ? 'Ask a project admin to assign tasks to you.' : `No ${filter} tasks.`}</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(task => {
            const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            return (
              <div key={task.id} className="card" style={styles.taskCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{task.title}</span>
                      <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    </div>
                    {task.description && <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 10 }}>{task.description}</p>}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
                      <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        ◈ {task.project_name}
                      </Link>
                      {task.due_date && (
                        <span style={{ color: overdue ? 'var(--danger)' : 'var(--text3)' }}>
                          {overdue ? '⚠ Overdue: ' : '📅 '}{format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span style={{ color: 'var(--text3)' }}>
                        Created {format(new Date(task.created_at), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 32, maxWidth: 900, margin: '0 auto', width: '100%' },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  filters: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  filter: { padding: '6px 16px', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border2)', borderRadius: 20, fontWeight: 600, fontSize: 13 },
  filterActive: { padding: '6px 16px', background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', borderRadius: 20, fontWeight: 600, fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  taskCard: { transition: 'border-color 0.15s' },
};
