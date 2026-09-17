const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics (admin only)
   */
  router.get('/stats', authenticate, authorize('admin'), (req, res) => {
    try {
      // Total tickets
      const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;

      // Open tickets (active)
      const openTickets = db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('closed', 'resolved', 'rejected')
      `).get().count;

      // Resolved tickets
      const resolvedTickets = db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE status IN ('resolved', 'closed')
      `).get().count;

      // Escalated tickets
      const escalatedTickets = db.prepare(`
        SELECT COUNT(*) as count FROM tickets WHERE status = 'escalated'
      `).get().count;

      // Tickets by category
      const byCategory = db.prepare(`
        SELECT category, COUNT(*) as count FROM tickets GROUP BY category ORDER BY count DESC
      `).all();

      // Tickets by priority
      const byPriority = db.prepare(`
        SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority ORDER BY 
          CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
      `).all();

      // Tickets by status
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count FROM tickets GROUP BY status ORDER BY count DESC
      `).all();

      // Average resolution time (for resolved tickets)
      const avgResolution = db.prepare(`
        SELECT AVG(
          (julianday(resolved_at) - julianday(created_at)) * 24
        ) as avg_hours
        FROM tickets
        WHERE resolved_at IS NOT NULL
      `).get();

      // Auto-resolved count
      const autoResolved = db.prepare(`
        SELECT COUNT(*) as count FROM audit_log 
        WHERE action = 'ticket_created' AND performed_by = 'AI Agent'
        AND ticket_id IN (SELECT id FROM tickets WHERE status IN ('resolved', 'closed'))
      `).get().count;

      // KB article usage
      const kbUsage = db.prepare(`
        SELECT kb_articles_referenced FROM tickets WHERE kb_articles_referenced != '[]'
      `).all();

      const kbCounts = {};
      for (const row of kbUsage) {
        try {
          const refs = JSON.parse(row.kb_articles_referenced);
          for (const ref of refs) {
            kbCounts[ref] = (kbCounts[ref] || 0) + 1;
          }
        } catch (e) { /* skip */ }
      }

      const kbUsageArr = Object.entries(kbCounts)
        .map(([kb_id, count]) => ({ kb_id, count }))
        .sort((a, b) => b.count - a.count);

      // Recent tickets
      const recentTickets = db.prepare(`
        SELECT t.*, u.name as employee_name
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC LIMIT 5
      `).all();

      // Total users
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('employee').count;

      res.json({
        stats: {
          totalTickets,
          openTickets,
          resolvedTickets,
          escalatedTickets,
          autoResolved,
          totalUsers,
          avgResolutionHours: avgResolution.avg_hours ? Math.round(avgResolution.avg_hours * 10) / 10 : 0,
          resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0
        },
        byCategory,
        byPriority,
        byStatus,
        kbUsage: kbUsageArr,
        recentTickets
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      res.status(500).json({ error: 'Unable to fetch dashboard statistics.' });
    }
  });

  /**
   * GET /api/dashboard/trends
   * Get ticket trends over time (admin only)
   */
  router.get('/trends', authenticate, authorize('admin'), (req, res) => {
    try {
      // Tickets per day (last 7 days)
      const dailyTickets = db.prepare(`
        SELECT date(created_at) as date, COUNT(*) as count
        FROM tickets
        WHERE created_at >= date('now', '-7 days')
        GROUP BY date(created_at)
        ORDER BY date ASC
      `).all();

      // Tickets per category over time
      const categoryTrends = db.prepare(`
        SELECT date(created_at) as date, category, COUNT(*) as count
        FROM tickets
        WHERE created_at >= date('now', '-7 days')
        GROUP BY date(created_at), category
        ORDER BY date ASC
      `).all();

      res.json({ dailyTickets, categoryTrends });
    } catch (err) {
      console.error('Dashboard trends error:', err);
      res.status(500).json({ error: 'Unable to fetch trends.' });
    }
  });

  return router;
};
