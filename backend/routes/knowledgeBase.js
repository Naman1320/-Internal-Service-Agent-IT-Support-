const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * GET /api/kb
   * List all KB articles (all authenticated users)
   */
  router.get('/', authenticate, (req, res) => {
    try {
      const { category, search } = req.query;
      let query = 'SELECT * FROM knowledge_base WHERE 1=1';
      const params = [];

      if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
      }

      if (search) {
        query += ' AND (title LIKE ? OR content LIKE ? OR kb_id LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      query += ' ORDER BY kb_id ASC';
      const articles = db.prepare(query).all(...params);

      res.json({ articles });
    } catch (err) {
      console.error('List KB error:', err);
      res.status(500).json({ error: 'Unable to fetch knowledge base.' });
    }
  });

  /**
   * GET /api/kb/:id
   * Get single KB article
   */
  router.get('/:id', authenticate, (req, res) => {
    try {
      const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ? OR kb_id = ?').get(req.params.id, req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found.' });
      }
      res.json({ article });
    } catch (err) {
      console.error('Get KB error:', err);
      res.status(500).json({ error: 'Unable to fetch article.' });
    }
  });

  /**
   * POST /api/kb
   * Create KB article (admin only)
   */
  router.post('/', authenticate, authorize('admin'), (req, res) => {
    try {
      const { kb_id, title, category, content, keywords, requires_approval, auto_resolvable, escalation_required } = req.body;

      if (!kb_id || !title || !category || !content) {
        return res.status(400).json({ error: 'KB ID, title, category, and content are required.' });
      }

      // Check duplicate
      const existing = db.prepare('SELECT id FROM knowledge_base WHERE kb_id = ?').get(kb_id);
      if (existing) {
        return res.status(409).json({ error: 'A KB article with this ID already exists.' });
      }

      db.prepare(`
        INSERT INTO knowledge_base (kb_id, title, category, content, keywords, requires_approval, auto_resolvable, escalation_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        kb_id, title, category, content,
        JSON.stringify(keywords || []),
        requires_approval ? 1 : 0,
        auto_resolvable ? 1 : 0,
        escalation_required ? 1 : 0
      );

      res.status(201).json({ message: 'KB article created successfully.' });
    } catch (err) {
      console.error('Create KB error:', err);
      res.status(500).json({ error: 'Unable to create article.' });
    }
  });

  /**
   * PUT /api/kb/:id
   * Update KB article (admin only)
   */
  router.put('/:id', authenticate, authorize('admin'), (req, res) => {
    try {
      const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found.' });
      }

      const { title, category, content, keywords, requires_approval, auto_resolvable, escalation_required } = req.body;

      db.prepare(`
        UPDATE knowledge_base SET
          title = COALESCE(?, title),
          category = COALESCE(?, category),
          content = COALESCE(?, content),
          keywords = COALESCE(?, keywords),
          requires_approval = COALESCE(?, requires_approval),
          auto_resolvable = COALESCE(?, auto_resolvable),
          escalation_required = COALESCE(?, escalation_required),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title || null,
        category || null,
        content || null,
        keywords ? JSON.stringify(keywords) : null,
        requires_approval !== undefined ? (requires_approval ? 1 : 0) : null,
        auto_resolvable !== undefined ? (auto_resolvable ? 1 : 0) : null,
        escalation_required !== undefined ? (escalation_required ? 1 : 0) : null,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(req.params.id);
      res.json({ message: 'Article updated successfully.', article: updated });
    } catch (err) {
      console.error('Update KB error:', err);
      res.status(500).json({ error: 'Unable to update article.' });
    }
  });

  /**
   * DELETE /api/kb/:id
   * Delete KB article (admin only)
   */
  router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
    try {
      const article = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found.' });
      }

      db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
      res.json({ message: 'Article deleted successfully.' });
    } catch (err) {
      console.error('Delete KB error:', err);
      res.status(500).json({ error: 'Unable to delete article.' });
    }
  });

  return router;
};
