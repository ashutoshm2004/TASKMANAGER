const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

router.post('/signup', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role = 'member' } = req.body;
  const { queryOne, run } = getDb();
  if (queryOne('SELECT id FROM users WHERE email = ?', [email])) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, role]);
  const token = jwt.sign({ userId: lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
  const user = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [lastInsertRowid]);
  res.status(201).json({ token, user });
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const { queryOne } = getDb();
  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.get('/users', authenticate, (req, res) => {
  const { query } = getDb();
  const users = query('SELECT id, name, email, role, created_at FROM users ORDER BY name');
  res.json({ users });
});

module.exports = router;
