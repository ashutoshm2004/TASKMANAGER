const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, requireProjectMember, requireProjectAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireProjectMember, (req, res) => {
  const { query } = getDb();
  const { status, priority, assignee } = req.query;
  let sql = `SELECT t.*, u1.name as assignee_name, u1.email as assignee_email, u2.name as created_by_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.project_id = ?`;
  const params = [req.params.projectId];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { sql += ' AND t.assignee_id = ?'; params.push(parseInt(assignee)); }
  sql += ' ORDER BY t.created_at DESC';
  res.json({ tasks: query(sql, params) });
});

router.post('/', authenticate, requireProjectMember, [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('assigneeId').optional().isInt(),
  body('dueDate').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, status = 'todo', priority = 'medium', assigneeId, dueDate } = req.body;
  const { queryOne, run } = getDb();
  const projectId = req.params.projectId;
  if (assigneeId) {
    const member = queryOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, assigneeId]);
    const isOwner = queryOne('SELECT id FROM projects WHERE id = ? AND owner_id = ?', [projectId, assigneeId]);
    if (!member && !isOwner) return res.status(400).json({ error: 'Assignee must be a project member' });
  }
  const { lastInsertRowid } = run(`INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, status, priority, projectId, assigneeId || null, req.user.id, dueDate || null]);
  const task = queryOne(`SELECT t.*, u1.name as assignee_name, u2.name as created_by_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ?`, [lastInsertRowid]);
  res.status(201).json({ task });
});

router.put('/:taskId', authenticate, requireProjectMember, [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { queryOne, run } = getDb();
  const taskId = req.params.taskId;
  const projectId = req.params.projectId;
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [taskId, projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, description, status, priority, assigneeId, dueDate } = req.body;
  const fields = [], values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(assigneeId); }
  if (dueDate !== undefined) { fields.push('due_date = ?'); values.push(dueDate); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  fields.push('updated_at = ?'); values.push(new Date().toISOString());
  values.push(taskId);
  run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = queryOne(`SELECT t.*, u1.name as assignee_name, u2.name as created_by_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ?`, [taskId]);
  res.json({ task: updated });
});

router.delete('/:taskId', authenticate, requireProjectMember, (req, res) => {
  const { queryOne, run } = getDb();
  const task = queryOne('SELECT * FROM tasks WHERE id = ? AND project_id = ?', [req.params.taskId, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const isCreator = task.created_by === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isProjAdmin = queryOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?',
    [req.params.projectId, req.user.id, 'admin']);
  if (!isCreator && !isAdmin && !isProjAdmin) return res.status(403).json({ error: 'Not authorized' });
  run('DELETE FROM tasks WHERE id = ?', [req.params.taskId]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
