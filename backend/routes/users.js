const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * GET /api/users
   * List all users (admin only)
   */
  router.get('/', authenticate, authorize('admin'), (req, res) => {
    try {
      const { search, role } = req.query;
      let query = `
        SELECT id, employee_id, name, email, role, department, employment_type, is_active, created_at
        FROM users WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      if (role && role !== 'all') {
        query += ' AND role = ?';
        params.push(role);
      }

      query += ' ORDER BY created_at DESC';
      const users = db.prepare(query).all(...params);

      // Get ticket counts per user
      const ticketCounts = db.prepare(`
        SELECT user_id, COUNT(*) as count FROM tickets GROUP BY user_id
      `).all();

      const countMap = {};
      for (const tc of ticketCounts) {
        countMap[tc.user_id] = tc.count;
      }

      const usersWithCounts = users.map(u => ({
        ...u,
        ticket_count: countMap[u.id] || 0
      }));

      res.json({ users: usersWithCounts });
    } catch (err) {
      console.error('List users error:', err);
      res.status(500).json({ error: 'Unable to fetch users.' });
    }
  });

  /**
   * PUT /api/users/:id
   * Update user (admin only)
   */
  router.put('/:id', authenticate, authorize('admin'), (req, res) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const { role, department, is_active, employment_type } = req.body;

      db.prepare(`
        UPDATE users SET
          role = COALESCE(?, role),
          department = COALESCE(?, department),
          is_active = COALESCE(?, is_active),
          employment_type = COALESCE(?, employment_type)
        WHERE id = ?
      `).run(
        role || null,
        department || null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        employment_type || null,
        req.params.id
      );

      const updated = db.prepare('SELECT id, employee_id, name, email, role, department, employment_type, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
      res.json({ message: 'User updated successfully.', user: updated });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Unable to update user.' });
    }
  });

  /**
   * DELETE /api/users/:id
   * Delete user (admin only)
   */
  router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      if (req.user.id === targetUserId) {
        return res.status(400).json({ error: 'You cannot delete your own admin account.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

      res.json({ message: `User ${user.name} (${user.email}) deleted successfully.` });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Unable to delete user.' });
    }
  });

  return router;
};
