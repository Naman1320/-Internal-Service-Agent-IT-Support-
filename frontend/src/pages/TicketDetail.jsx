import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function parseMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^[•●] (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversation');
  const [adminNote, setAdminNote] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const data = await api.getTicket(id);
      setTicket(data.ticket);
      setMessages(data.messages);
      setAuditLog(data.auditLog);
      setAdminStatus(data.ticket.status);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async () => {
    setSaving(true);
    try {
      await api.updateTicket(id, {
        status: adminStatus,
        note: adminNote || undefined
      });
      setAdminNote('');
      fetchTicket();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!ticket) return <div className="empty-state"><h3>Ticket not found</h3></div>;

  const statusLabel = (s) => s?.replace(/_/g, ' ') || '';
  const priorityIcon = (p) => ({ critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪');

  let kbRefs = [];
  try { kbRefs = JSON.parse(ticket.kb_articles_referenced || '[]'); } catch (e) {}

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span className="ticket-card-id" style={{ fontSize: '14px' }}>{ticket.ticket_id}</span>
            <span className={`badge badge-status badge-${ticket.status}`}>{statusLabel(ticket.status)}</span>
            <span className={`badge badge-${ticket.priority}`}>{priorityIcon(ticket.priority)} {ticket.priority}</span>
          </div>
          <h1>{ticket.subject}</h1>
          <p>{ticket.employee_name} • {ticket.category} • Opened {new Date(ticket.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Ticket metadata card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '13px' }}>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>Assigned To</div>
            <div>{ticket.assigned_to}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>Category</div>
            <div>{ticket.category}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>Created</div>
            <div>{new Date(ticket.created_at).toLocaleString()}</div>
          </div>
          {ticket.resolved_at && (
            <div>
              <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>Resolved</div>
              <div>{new Date(ticket.resolved_at).toLocaleString()}</div>
            </div>
          )}
          {kbRefs.length > 0 && (
            <div>
              <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>KB References</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {kbRefs.map((ref, i) => (
                  <span key={i} className="chat-kb-tag">{ref}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {ticket.agent_reasoning && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Agent Reasoning:</strong> {ticket.agent_reasoning}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'conversation' ? 'active' : ''}`} onClick={() => setActiveTab('conversation')}>
          💬 Conversation
        </button>
        <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📋 Audit Trail
        </button>
        {user.role === 'admin' && (
          <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            ⚙️ Admin Actions
          </button>
        )}
      </div>

      {/* Conversation */}
      {activeTab === 'conversation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender_type}`} style={{ maxWidth: '85%' }}>
              <div className="chat-avatar">
                {msg.sender_type === 'agent' ? '🤖' : msg.sender_type === 'admin' ? '👑' : '👤'}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  {msg.sender_type === 'agent' ? 'AI Agent' : msg.sender_type === 'admin' ? `Admin: ${msg.sender_name || 'IT Admin'}` : msg.sender_name || 'Employee'}
                </div>
                <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                <div className="chat-timestamp">{new Date(msg.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="empty-state"><p>No messages in this conversation yet.</p></div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {activeTab === 'audit' && (
        <div className="audit-trail">
          {auditLog.map((entry, i) => (
            <div key={i} className="audit-entry">
              <div className="audit-entry-time">{new Date(entry.created_at).toLocaleString()}</div>
              <div className="audit-entry-action">{entry.action.replace(/_/g, ' ')}</div>
              <div className="audit-entry-detail">
                <strong>By:</strong> {entry.performed_by}<br/>
                {entry.details}
                {entry.reasoning && (
                  <><br/><strong>Reasoning:</strong> {entry.reasoning}</>
                )}
              </div>
            </div>
          ))}
          {auditLog.length === 0 && (
            <div className="empty-state"><p>No audit trail entries.</p></div>
          )}
        </div>
      )}

      {/* Admin Actions */}
      {activeTab === 'admin' && user.role === 'admin' && (
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Update Ticket</h3>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_approval">Waiting Approval</option>
              <option value="waiting_response">Waiting Response</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Admin Note (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Add a note to this ticket..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdminUpdate} disabled={saving}>
            {saving ? 'Saving...' : 'Update Ticket'}
          </button>
        </div>
      )}
    </div>
  );
}
