const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, generateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * POST /api/auth/register
   */
  router.post('/register', (req, res) => {
    try {
      const { name, email, password, department, employment_type } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
        return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&).' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      // Check existing user
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);

      // Generate employee ID
      const lastUser = db.prepare('SELECT employee_id FROM users ORDER BY id DESC LIMIT 1').get();
      let nextNum = 200;
      if (lastUser && lastUser.employee_id) {
        const match = lastUser.employee_id.match(/EMP-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const employee_id = `EMP-${String(nextNum).padStart(3, '0')}`;

      // Insert user
      const result = db.prepare(`
        INSERT INTO users (employee_id, name, email, password_hash, role, department, employment_type)
        VALUES (?, ?, ?, ?, 'employee', ?, ?)
      `).run(employee_id, name, email, password_hash, department || 'General', employment_type || 'full-time');

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      const token = generateToken(user);

      res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employment_type: user.employment_type
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Unable to create account. Please try again.' });
    }
  });

  /**
   * POST /api/auth/login
   */
  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'This account has been deactivated. Please contact IT.' });
      }

      const validPassword = bcrypt.compareSync(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user);

      res.json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employment_type: user.employment_type
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Unable to log in. Please try again.' });
    }
  });

  /**
   * GET /api/auth/me
   */
  router.get('/me', authenticate, (req, res) => {
    try {
      const user = db.prepare('SELECT id, employee_id, name, email, role, department, employment_type, created_at FROM users WHERE id = ?').get(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json({ user });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ error: 'Unable to fetch user data.' });
    }
  });

  return router;
};
