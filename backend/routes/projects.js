const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const { query } = getDb();
  let projects;
  if (req.user.role === 'admin') {
    projects = query(`SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC`);
  } else {
    projects = query(`SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
      ORDER BY p.created_at DESC`, [req.user.id, req.user.id]);
  }
  res.json({ projects });
});

router.post('/', authenticate, [
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'completed', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description, status = 'active' } = req.body;
  const { run, queryOne } = getDb();
  const { lastInsertRowid } = run('INSERT INTO projects (name, description, status, owner_id) VALUES (?, ?, ?, ?)',
    [name, description || null, status, req.user.id]);
  run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
    [lastInsertRowid, req.user.id, 'admin']);
  const project = queryOne(`SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`, [lastInsertRowid]);
  res.status(201).json({ project });
});

router.get('/:id', authenticate, requireProjectMember, (req, res) => {
  const { query, queryOne } = getDb();
  const projectId = req.params.id;
  const members = query(`SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ? ORDER BY u.name`, [projectId]);
  const taskStats = queryOne(`SELECT COUNT(*) as total,
    SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,
    SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
    SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE project_id = ?`, [projectId]);
  res.json({ project: req.project, members, taskStats });
});

router.put('/:id', authenticate, requireProjectAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'completed', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description, status } = req.body;
  const { run, queryOne } = getDb();
  const projectId = req.params.id;
  const fields = [], values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(projectId);
  run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
  const project = queryOne(`SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`, [projectId]);
  res.json({ project });
});

router.delete('/:id', authenticate, requireProjectAdmin, (req, res) => {
  const { run } = getDb();
  run('DELETE FROM projects WHERE id = ?', [req.params.id]);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', authenticate, requireProjectAdmin, [
  body('userId').isInt(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { userId, role = 'member' } = req.body;
  const { queryOne, run } = getDb();
  const user = queryOne('SELECT id, name, email FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [req.params.id, userId, role]);
    res.status(201).json({ message: 'Member added', user, role });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'User already a member' });
    throw err;
  }
});

router.delete('/:id/members/:userId', authenticate, requireProjectAdmin, (req, res) => {
  const { run } = getDb();
  run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  res.json({ message: 'Member removed' });
});

module.exports = router;
