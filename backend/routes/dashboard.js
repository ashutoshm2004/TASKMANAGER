const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const { query, queryOne } = getDb();
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let projectIds;
  if (isAdmin) {
    projectIds = query('SELECT id FROM projects').map(r => r.id);
  } else {
    const owned = query('SELECT id FROM projects WHERE owner_id = ?', [userId]).map(r => r.id);
    const member = query('SELECT project_id as id FROM project_members WHERE user_id = ?', [userId]).map(r => r.id);
    projectIds = [...new Set([...owned, ...member])];
  }

  if (!projectIds.length) {
    return res.json({
      stats: { totalProjects: 0, totalTasks: 0, myTasks: 0, overdueTasks: 0 },
      recentTasks: [], projectSummaries: [],
      tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
    });
  }

  const ph = projectIds.map(() => '?').join(',');

  const stats = queryOne(`SELECT COUNT(DISTINCT p.id) as totalProjects, COUNT(t.id) as totalTasks,
    SUM(CASE WHEN t.assignee_id = ? THEN 1 ELSE 0 END) as myTasks,
    SUM(CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END) as overdueTasks
    FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id IN (${ph})`, [userId, ...projectIds]);

  const statusRows = query(`SELECT status, COUNT(*) as count FROM tasks WHERE project_id IN (${ph}) GROUP BY status`, projectIds);
  const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
  statusRows.forEach(r => { tasksByStatus[r.status] = r.count; });

  const recentTasks = query(`SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (${ph}) ORDER BY t.created_at DESC LIMIT 10`, projectIds);

  const projectSummaries = query(`SELECT p.*, u.name as owner_name,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
    SUM(CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END) as overdue_tasks
    FROM projects p JOIN users u ON p.owner_id = u.id LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id IN (${ph}) GROUP BY p.id ORDER BY p.created_at DESC LIMIT 6`, projectIds);

  res.json({ stats, recentTasks, projectSummaries, tasksByStatus });
});

module.exports = router;
