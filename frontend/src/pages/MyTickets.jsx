import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const data = await api.getTickets(params);
      setTickets(data.tickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';

  const priorityIcon = (p) => {
    const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    return icons[p] || '⚪';
  };

  return (
    <div>
      <div className="page-header">
        <h1>My Tickets</h1>
        <p>Track the status of your IT support requests</p>
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_approval">Waiting Approval</option>
          <option value="waiting_response">Waiting Response</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <h3>No tickets found</h3>
          <p>You haven't submitted any IT requests yet. Start a conversation with the AI Agent to create a ticket.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/chat')}>
            💬 Talk to AI Agent
          </button>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card" onClick={() => navigate(`/tickets/${ticket.id}`)}>
              <div className="ticket-card-header">
                <span className="ticket-card-id">{ticket.ticket_id}</span>
                <span className={`badge badge-status badge-${ticket.status}`}>
                  {statusLabel(ticket.status)}
                </span>
              </div>
              <div className="ticket-card-title">{ticket.subject}</div>
              <div className="ticket-card-desc">{ticket.description}</div>
              <div className="ticket-card-meta">
                <span className={`badge badge-${ticket.priority}`}>
                  {priorityIcon(ticket.priority)} {ticket.priority}
                </span>
                <span className="badge badge-info">{ticket.category}</span>
                <span className="meta-item">📅 {new Date(ticket.created_at).toLocaleDateString()}</span>
                <span className="meta-item">👤 {ticket.assigned_to}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
