import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AllTickets() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', category: 'all', priority: 'all', search: '', page: 1 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => { if (params[k] === 'all' || params[k] === '') delete params[k]; });
      const data = await api.getTickets(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : value }));
  };

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';
  const priorityIcon = (p) => ({ critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪');

  return (
    <div>
      <div className="page-header">
        <h1>All Tickets</h1>
        <p>Manage and monitor all IT support tickets</p>
      </div>

      <div className="filter-bar">
        <input
          className="form-input search-input"
          placeholder="🔍 Search tickets..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
        <select className="form-select" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_approval">Waiting Approval</option>
          <option value="waiting_response">Waiting Response</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <select className="form-select" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
          <option value="all">All Categories</option>
          <option value="Account Access">Account Access</option>
          <option value="Network Access">Network Access</option>
          <option value="Hardware">Hardware</option>
          <option value="Software">Software</option>
          <option value="Email">Email</option>
          <option value="Security">Security</option>
          <option value="Unknown">Unknown</option>
        </select>
        <select className="form-select" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <h3>No tickets match your filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Employee</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                    <td><span className="table-link">{ticket.ticket_id}</span></td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{ticket.employee_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{ticket.emp_id}</div>
                    </td>
                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject}
                    </td>
                    <td><span className="badge badge-info">{ticket.category}</span></td>
                    <td><span className={`badge badge-${ticket.priority}`}>{priorityIcon(ticket.priority)} {ticket.priority}</span></td>
                    <td><span className={`badge badge-status badge-${ticket.status}`}>{statusLabel(ticket.status)}</span></td>
                    <td style={{ fontSize: '12px' }}>{ticket.assigned_to}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => updateFilter('page', pagination.page - 1)}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilter('page', pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
