const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * GET /api/tickets
   * List tickets — employees see only their own, admins see all
   */
  router.get('/', authenticate, (req, res) => {
    try {
      const { status, category, priority, search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT t.*, u.name as employee_name, u.email as employee_email, u.employee_id as emp_id
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      // Role-based filtering
      if (req.user.role !== 'admin') {
        query += ' AND t.user_id = ?';
        params.push(req.user.id);
      }

      // Filter by status
      if (status && status !== 'all') {
        query += ' AND t.status = ?';
        params.push(status);
      }

      // Filter by category
      if (category && category !== 'all') {
        query += ' AND t.category = ?';
        params.push(category);
      }

      // Filter by priority
      if (priority && priority !== 'all') {
        query += ' AND t.priority = ?';
        params.push(priority);
      }

      // Search
      if (search) {
        query += ' AND (t.subject LIKE ? OR t.description LIKE ? OR t.ticket_id LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Count total
      const countQuery = query.replace('SELECT t.*, u.name as employee_name, u.email as employee_email, u.employee_id as emp_id', 'SELECT COUNT(*) as total');
      const countResult = db.prepare(countQuery).get(...params);

      // Add ordering and pagination
      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const tickets = db.prepare(query).all(...params);

      res.json({
        tickets,
        pagination: {
          total: countResult.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.total / parseInt(limit))
        }
      });
    } catch (err) {
      console.error('List tickets error:', err);
      res.status(500).json({ error: 'Unable to fetch tickets.' });
    }
  });

  /**
   * GET /api/tickets/:id
   * Get ticket details with messages and audit trail
   */
  router.get('/:id', authenticate, (req, res) => {
    try {
      const ticket = db.prepare(`
        SELECT t.*, u.name as employee_name, u.email as employee_email, u.employee_id as emp_id
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
      `).get(req.params.id);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      // Authorization
      if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
      }

      // Get messages
      const messages = db.prepare(`
        SELECT m.*, u.name as sender_name
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = ?
        ORDER BY m.created_at ASC
      `).all(req.params.id);

      // Get audit trail
      const auditLog = db.prepare(`
        SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC
      `).all(req.params.id);

      res.json({ ticket, messages, auditLog });
    } catch (err) {
      console.error('Get ticket error:', err);
      res.status(500).json({ error: 'Unable to fetch ticket details.' });
    }
  });

  /**
   * PUT /api/tickets/:id
   * Update ticket (admin only, or employees updating their own ticket's limited fields)
   */
  router.put('/:id', authenticate, (req, res) => {
    try {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      const { status, priority, assigned_to, resolution, note } = req.body;

      if (req.user.role === 'admin') {
        // Admin can update all fields
        const updates = [];
        const params = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (priority) { updates.push('priority = ?'); params.push(priority); }
        if (assigned_to) { updates.push('assigned_to = ?'); params.push(assigned_to); }
        if (resolution) { updates.push('resolution = ?'); params.push(resolution); }
        if (status === 'resolved' || status === 'closed') {
          updates.push('resolved_at = CURRENT_TIMESTAMP');
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');

        if (updates.length > 1) {
          const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`;
          params.push(req.params.id);
          db.prepare(query).run(...params);
        }

        // Add admin note as message if provided
        if (note) {
          db.prepare(`
            INSERT INTO messages (ticket_id, sender_type, sender_id, content, action_taken)
            VALUES (?, 'admin', ?, ?, ?)
          `).run(req.params.id, req.user.id, note, `Admin update: ${status || 'note added'}`);
        }

        // Audit log
        db.prepare(`
          INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning)
          VALUES (?, 'admin_update', ?, ?, ?)
        `).run(
          req.params.id,
          `Updated: ${Object.entries({ status, priority, assigned_to }).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ')}`,
          req.user.name,
          note || 'Admin manual update'
        );

        const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
        return res.json({ message: 'Ticket updated successfully.', ticket: updatedTicket });
      }

      // Employee — limited update (can only add messages)
      if (ticket.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this ticket.' });
      }

      return res.status(403).json({ error: 'Please use the chat to update your ticket.' });
    } catch (err) {
      console.error('Update ticket error:', err);
      res.status(500).json({ error: 'Unable to update ticket.' });
    }
  });

  return router;
};
