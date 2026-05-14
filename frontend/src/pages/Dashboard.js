import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.center}><div className="spinner" /></div>;

  const { stats, recentTasks, projectSummaries, tasksByStatus } = data;

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: '◈', color: 'var(--primary)' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: '◎', color: 'var(--accent)' },
    { label: 'My Tasks', value: stats.myTasks, icon: '⬡', color: 'var(--success)' },
    { label: 'Overdue', value: stats.overdueTasks, icon: '⚠', color: 'var(--danger)' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Good {getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/projects/new">
          <button className="btn-primary">+ New Project</button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div style={styles.statGrid}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: s.color + '22', color: s.color }}>{s.icon}</div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Task Status Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={styles.sectionTitle}>Task Overview</h3>
        <div style={styles.statusBar}>
          {stats.totalTasks > 0 ? (
            <>
              <div style={{ ...styles.barSegment, background: '#64748b', flex: tasksByStatus.todo || 0 }} title={`Todo: ${tasksByStatus.todo}`} />
              <div style={{ ...styles.barSegment, background: 'var(--primary)', flex: tasksByStatus.in_progress || 0 }} title={`In Progress: ${tasksByStatus.in_progress}`} />
              <div style={{ ...styles.barSegment, background: 'var(--success)', flex: tasksByStatus.done || 0 }} title={`Done: ${tasksByStatus.done}`} />
            </>
          ) : <div style={{ ...styles.barSegment, background: 'var(--bg3)', flex: 1 }} />}
        </div>
        <div style={styles.legendRow}>
          <LegendItem color="#64748b" label="Todo" count={tasksByStatus.todo} />
          <LegendItem color="var(--primary)" label="In Progress" count={tasksByStatus.in_progress} />
          <LegendItem color="var(--success)" label="Done" count={tasksByStatus.done} />
        </div>
      </div>

      <div style={styles.grid2}>
        {/* Recent Tasks */}
        <div className="card">
          <h3 style={styles.sectionTitle}>Recent Tasks</h3>
          {recentTasks.length === 0
            ? <div className="empty-state"><div className="icon">📋</div><p>No tasks yet</p></div>
            : recentTasks.slice(0, 6).map(t => (
              <div key={t.id} style={styles.taskRow}>
                <div style={styles.taskLeft}>
                  <StatusDot status={t.status} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t.project_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.due_date && (
                    <span style={{ fontSize: 11, color: isPast(parseISO(t.due_date)) && t.status !== 'done' ? 'var(--danger)' : 'var(--text3)' }}>
                      {format(parseISO(t.due_date), 'MMM d')}
                    </span>
                  )}
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>
            ))}
        </div>

        {/* Projects Summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Projects</h3>
            <Link to="/projects" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>View all →</Link>
          </div>
          {projectSummaries.length === 0
            ? <div className="empty-state"><div className="icon">◈</div><p>No projects yet</p></div>
            : projectSummaries.map(p => {
              const pct = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={styles.projRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct}%</span>
                    </div>
                    <div style={styles.progressBg}>
                      <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
                      <span>{p.total_tasks} tasks</span>
                      {p.overdue_tasks > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {p.overdue_tasks} overdue</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span>{label}</span>
      <span style={{ color: 'var(--text3)' }}>({count || 0})</span>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = { todo: '#64748b', in_progress: 'var(--primary)', done: 'var(--success)' };
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status], flexShrink: 0, marginTop: 2 }} />;
}

function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = {
  page: { padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  statValue: { fontSize: 32, fontWeight: 800 },
  statLabel: { fontSize: 13, color: 'var(--text3)' },
  sectionTitle: { fontWeight: 700, fontSize: 15, marginBottom: 16 },
  statusBar: { display: 'flex', height: 10, borderRadius: 10, overflow: 'hidden', gap: 2, marginBottom: 12 },
  barSegment: { borderRadius: 10, minWidth: 4, transition: 'flex 0.4s ease' },
  legendRow: { display: 'flex', gap: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  taskRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  taskLeft: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  projRow: { padding: '12px 0', borderBottom: '1px solid var(--border)' },
  progressBg: { height: 4, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--primary)', borderRadius: 10, transition: 'width 0.4s ease' },
};
