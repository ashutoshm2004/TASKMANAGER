const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskmanager_secret_key_2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { queryOne } = getDb();
    const user = queryOne('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireProjectAdmin(req, res, next) {
  const { queryOne } = getDb();
  const projectId = req.params.projectId || req.params.id;
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.owner_id === req.user.id || req.user.role === 'admin') {
    req.project = project; return next();
  }
  const member = queryOne('SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?', [projectId, req.user.id, 'admin']);
  if (member) { req.project = project; return next(); }
  return res.status(403).json({ error: 'Project admin access required' });
}

function requireProjectMember(req, res, next) {
  const { queryOne } = getDb();
  const projectId = req.params.projectId || req.params.id;
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.owner_id === req.user.id || req.user.role === 'admin') {
    req.project = project; return next();
  }
  const member = queryOne('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
  if (member) { req.project = project; return next(); }
  return res.status(403).json({ error: 'Project access required' });
}

module.exports = { authenticate, requireProjectAdmin, requireProjectMember, JWT_SECRET };
