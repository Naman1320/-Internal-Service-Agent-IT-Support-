const express = require('express');
const { authenticate } = require('../middleware/auth');
const AgentEngine = require('../services/agentEngine');

module.exports = function(db) {
  const router = express.Router();
  const agent = new AgentEngine(db);

  /**
   * POST /api/agent/train
   * Train / Re-index the AI Agent Model on current KB articles and historical resolved tickets
   */
  router.post('/train', authenticate, (req, res) => {
    try {
      const metrics = agent.trainModel();
      return res.json({
        message: 'AI Agent model successfully re-trained and re-indexed.',
        metrics: metrics
      });
    } catch (err) {
      console.error('Error training model:', err);
      return res.status(500).json({ error: 'Failed to train AI Agent model.' });
    }
  });

  /**
   * GET /api/agent/train/status
   * Get current model training status & vocabulary metrics
   */
  router.get('/train/status', authenticate, (req, res) => {
    return res.json(agent.trainingMetrics || { status: 'untrained' });
  });

  /**
   * POST /api/agent/evaluate
   * Evaluate a request and output strict JSON decision schema
   */
  router.post('/evaluate', authenticate, (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Please provide a message to evaluate.' });
      }
      const evaluation = agent.evaluateRequestToJSON(message.trim(), req.user ? req.user.id : null);
      return res.json(evaluation);
    } catch (err) {
      console.error('Error evaluating request:', err);
      return res.status(500).json({ error: 'Failed to evaluate request.' });
    }
  });

  /**
   * POST /api/agent/chat
   * Send a message to the AI agent
   */
  router.post('/chat', authenticate, (req, res) => {
    try {
      const { message, ticketId } = req.body;
      const userId = req.user.id;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Please provide a message.' });
      }

      const trimmedMessage = message.trim();

      // If continuing existing conversation
      if (ticketId) {
        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?').get(ticketId, userId);
        if (!ticket) {
          return res.status(404).json({ error: 'Ticket not found.' });
        }

        // Process follow-up
        const result = agent.processFollowUp(trimmedMessage, ticketId, userId);

        // Save employee message
        db.prepare(`
          INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken)
          VALUES (?, 'employee', ?, ?, '[]', NULL)
        `).run(ticketId, userId, trimmedMessage);

        // Save agent response
        db.prepare(`
          INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken)
          VALUES (?, 'agent', NULL, ?, ?, ?)
        `).run(
          ticketId,
          result.response.message,
          JSON.stringify(result.kbArticles.map(a => a.kb_id)),
          result.response.action
        );

        // Update ticket
        db.prepare(`
          UPDATE tickets SET
            status = ?,
            priority = ?,
            category = CASE WHEN category = 'Unknown' THEN ? ELSE category END,
            kb_articles_referenced = ?,
            agent_reasoning = ?,
            updated_at = CURRENT_TIMESTAMP,
            resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
          WHERE id = ?
        `).run(
          result.response.status,
          result.response.priority,
          result.ticketData.category,
          result.ticketData.kb_articles_referenced,
          result.ticketData.agent_reasoning,
          result.response.status,
          ticketId
        );

        // Audit log
        db.prepare(`
          INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning)
          VALUES (?, ?, ?, 'AI Agent', ?)
        `).run(ticketId, 'follow_up_processed', result.response.action, result.ticketData.agent_reasoning);

        return res.json({
          message: result.response.message,
          ticketId: ticketId,
          ticket_id: ticket.ticket_id,
          status: result.response.status,
          priority: result.response.priority,
          kbSources: result.kbArticles.map(a => ({ id: a.kb_id, title: a.title })),
          action: result.response.action,
          followUpQuestions: result.response.followUpQuestions || []
        });
      }

      // New conversation — process message
      const result = agent.processMessage(trimmedMessage, userId);

      // Generate ticket ID
      const lastTicket = db.prepare('SELECT ticket_id FROM tickets ORDER BY id DESC LIMIT 1').get();
      let nextNum = 1052;
      if (lastTicket) {
        const match = lastTicket.ticket_id.match(/TK-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const newTicketId = `TK-${nextNum}`;

      // Create ticket
      const ticketResult = db.prepare(`
        INSERT INTO tickets (ticket_id, user_id, category, priority, status, subject, description, assigned_to, kb_articles_referenced, agent_reasoning, resolved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newTicketId,
        userId,
        result.ticketData.category,
        result.ticketData.priority,
        result.response.status,
        result.ticketData.subject,
        trimmedMessage,
        result.ticketData.assigned_to,
        result.ticketData.kb_articles_referenced,
        result.ticketData.agent_reasoning,
        result.response.status === 'resolved' ? new Date().toISOString() : null
      );

      const newTicketDbId = ticketResult.lastInsertRowid;

      // Save employee message
      db.prepare(`
        INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken)
        VALUES (?, 'employee', ?, ?, '[]', NULL)
      `).run(newTicketDbId, userId, trimmedMessage);

      // Save agent response
      db.prepare(`
        INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken)
        VALUES (?, 'agent', NULL, ?, ?, ?)
      `).run(
        newTicketDbId,
        result.response.message,
        JSON.stringify(result.kbArticles.map(a => a.kb_id)),
        result.response.action
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning)
        VALUES (?, 'ticket_created', ?, 'AI Agent', ?)
      `).run(newTicketDbId, `New ticket: ${result.ticketData.subject}`, result.ticketData.agent_reasoning);

      res.status(201).json({
        message: result.response.message,
        ticketId: newTicketDbId,
        ticket_id: newTicketId,
        status: result.response.status,
        priority: result.response.priority,
        category: result.ticketData.category,
        kbSources: result.kbArticles.map(a => ({ id: a.kb_id, title: a.title })),
        action: result.response.action,
        followUpQuestions: result.response.followUpQuestions || []
      });

    } catch (err) {
      console.error('Agent chat error:', err);
      res.status(500).json({ error: 'Unable to process your request. Please try again.' });
    }
  });

  /**
   * GET /api/agent/conversation/:ticketId
   * Get conversation history for a ticket
   */
  router.get('/conversation/:ticketId', authenticate, (req, res) => {
    try {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      // Employees can only see their own tickets
      if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to view this conversation.' });
      }

      const messages = db.prepare(`
        SELECT m.*, u.name as sender_name 
        FROM messages m 
        LEFT JOIN users u ON m.sender_id = u.id 
        WHERE m.ticket_id = ? 
        ORDER BY m.created_at ASC
      `).all(req.params.ticketId);

      res.json({ ticket, messages });
    } catch (err) {
      console.error('Get conversation error:', err);
      res.status(500).json({ error: 'Unable to fetch conversation.' });
    }
  });

  return router;
};
