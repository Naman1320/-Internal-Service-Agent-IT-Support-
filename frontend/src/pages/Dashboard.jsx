import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CHART_COLORS = ['#3b5cf5', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!stats) return <div className="empty-state"><h3>Unable to load dashboard</h3></div>;

  const maxCategoryCount = Math.max(...stats.byCategory.map(c => c.count), 1);
  const maxStatusCount = Math.max(...stats.byStatus.map(s => s.count), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of IT support operations and ticket analytics</p>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent-color': '#3b5cf5' }}>
          <div className="stat-icon">🎫</div>
          <div className="stat-value">{stats.stats.totalTickets}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#f59e0b' }}>
          <div className="stat-icon">📂</div>
          <div className="stat-value">{stats.stats.openTickets}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#22c55e' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.stats.resolutionRate}%</div>
          <div className="stat-label">Resolution Rate</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#ef4444' }}>
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{stats.stats.escalatedTickets}</div>
          <div className="stat-label">Escalated</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#7c3aed' }}>
          <div className="stat-icon">🤖</div>
          <div className="stat-value">{stats.stats.autoResolved}</div>
          <div className="stat-label">Auto-Resolved</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#06b6d4' }}>
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{stats.stats.avgResolutionHours}h</div>
          <div className="stat-label">Avg Resolution Time</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#ec4899' }}>
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.stats.totalUsers}</div>
          <div className="stat-label">Total Employees</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#22c55e' }}>
          <div className="stat-icon">📗</div>
          <div className="stat-value">{stats.stats.resolvedTickets}</div>
          <div className="stat-label">Resolved Tickets</div>
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        {/* Tickets by Category */}
        <div className="chart-card">
          <h3>Tickets by Category</h3>
          <div className="chart-bar-container">
            {stats.byCategory.map((item, i) => (
              <div key={item.category} className="chart-bar-row">
                <span className="chart-bar-label">{item.category}</span>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(item.count / maxCategoryCount) * 100}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length]
                    }}
                  >
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets by Status */}
        <div className="chart-card">
          <h3>Tickets by Status</h3>
          <div className="chart-bar-container">
            {stats.byStatus.map((item, i) => {
              const statusColors = {
                open: '#3b82f6', in_progress: '#f59e0b', waiting_approval: '#a855f7',
                waiting_response: '#a855f7', escalated: '#ef4444', resolved: '#22c55e',
                rejected: '#ef4444', closed: '#64748b'
              };
              return (
                <div key={item.status} className="chart-bar-row">
                  <span className="chart-bar-label">{item.status.replace(/_/g, ' ')}</span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${(item.count / maxStatusCount) * 100}%`,
                        background: statusColors[item.status] || CHART_COLORS[i]
                      }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets by Priority */}
        <div className="chart-card">
          <h3>Tickets by Priority</h3>
          <div className="chart-bar-container">
            {stats.byPriority.map((item) => {
              const maxP = Math.max(...stats.byPriority.map(p => p.count), 1);
              const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
              return (
                <div key={item.priority} className="chart-bar-row">
                  <span className="chart-bar-label" style={{ textTransform: 'capitalize' }}>{item.priority}</span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${(item.count / maxP) * 100}%`,
                        background: colors[item.priority] || '#6366f1'
                      }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KB Article Usage */}
        <div className="chart-card">
          <h3>Most Referenced KB Articles</h3>
          {stats.kbUsage.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}><p>No KB usage data yet.</p></div>
          ) : (
            <div className="chart-bar-container">
              {stats.kbUsage.map((item, i) => {
                const maxKB = Math.max(...stats.kbUsage.map(k => k.count), 1);
                return (
                  <div key={item.kb_id} className="chart-bar-row">
                    <span className="chart-bar-label">{item.kb_id}</span>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{
                          width: `${(item.count / maxKB) * 100}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length]
                        }}
                      >
                        {item.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <h3>Recent Tickets</h3>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Employee</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTickets.map(ticket => (
                <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                  <td><span className="table-link">{ticket.ticket_id}</span></td>
                  <td>{ticket.employee_name}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</td>
                  <td><span className="badge badge-info">{ticket.category}</span></td>
                  <td><span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span></td>
                  <td><span className={`badge badge-status badge-${ticket.status}`}>{ticket.status.replace(/_/g, ' ')}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
