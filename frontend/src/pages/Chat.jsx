import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(59,130,246,0.1);padding:1px 5px;border-radius:3px;font-size:12px;">$1</code>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size:14px;font-weight:700;margin:8px 0 4px;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="font-size:15px;font-weight:700;margin:8px 0 4px;">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 style="font-size:16px;font-weight:700;margin:8px 0 4px;">$1</h2>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^[•●] (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/^(✅|❌|⚠️|🚨|📋|→) (.*$)/gm, '<p>$1 $2</p>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(\s*<br\/>)?)+/gs, (match) => {
    return '<ul style="padding-left:16px;margin:4px 0;">' + match.replace(/<br\/>/g, '') + '</ul>';
  });
  
  return html;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [currentTicketCode, setCurrentTicketCode] = useState(null);
  const [kbSources, setKbSources] = useState([]);
  const [activeFollowUps, setActiveFollowUps] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 'welcome',
      type: 'agent',
      content: `Hello${user?.name ? ', ' + user.name.split(' ')[0] : ''}! 👋\n\nI'm the **Veridian IT Service Agent**. I can help you with:\n\n• 🔑 Password resets & account access\n• 🌐 VPN & network issues\n• 💻 Laptop & hardware problems\n• 🖨️ Printer troubleshooting\n• 📧 Email & mailbox issues\n• 📦 Software installation requests\n• 🏠 Work-from-home equipment\n• 🔒 Security incident reporting\n\n**How can I help you today?** Just describe your issue in plain language.`,
      timestamp: new Date().toISOString(),
      kbSources: [],
      followUpQuestions: []
    }]);
  }, [user]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || sending) return;

    const userMessage = {
      id: Date.now(),
      type: 'employee',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setActiveFollowUps([]);
    setSending(true);

    try {
      const data = await api.sendMessage(messageText.trim(), currentTicketId);

      // Set ticket context for follow-ups
      if (data.ticketId && !currentTicketId) {
        setCurrentTicketId(data.ticketId);
        setCurrentTicketCode(data.ticket_id);
      }

      if (data.kbSources) {
        setKbSources(data.kbSources);
      }

      const followUps = data.followUpQuestions || [];

      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: data.message,
        timestamp: new Date().toISOString(),
        kbSources: data.kbSources || [],
        ticketId: data.ticket_id,
        status: data.status,
        action: data.action,
        followUpQuestions: followUps
      };

      setMessages(prev => [...prev, agentMessage]);
      setActiveFollowUps(followUps);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'agent',
        content: `I apologize, but I encountered an error processing your request. Please try again or contact IT directly.\n\n**Error:** ${err.message}`,
        timestamp: new Date().toISOString(),
        kbSources: [],
        followUpQuestions: []
      }]);
      setActiveFollowUps([]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleFollowUpClick = (question) => {
    sendMessage(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewConversation = () => {
    setCurrentTicketId(null);
    setCurrentTicketCode(null);
    setKbSources([]);
    setActiveFollowUps([]);
    setMessages([{
      id: 'welcome-new',
      type: 'agent',
      content: `Ready to help with a new issue! 🚀\n\nPlease describe your IT problem and I'll do my best to assist you.`,
      timestamp: new Date().toISOString(),
      kbSources: [],
      followUpQuestions: []
    }]);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>IT Support Agent</h1>
          <p>Describe your issue and the AI agent will help resolve it</p>
        </div>
        {currentTicketId && (
          <button className="btn btn-secondary btn-sm" onClick={startNewConversation}>
            ➕ New Conversation
          </button>
        )}
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="agent-avatar">🤖</div>
          <div className="agent-info">
            <h3>Veridian IT Agent</h3>
            <p>● Online — Ready to help</p>
          </div>
          {currentTicketCode && (
            <div style={{ marginLeft: 'auto' }}>
              <span className="badge badge-info" style={{ fontSize: '12px', padding: '4px 12px' }}>
                {currentTicketCode}
              </span>
            </div>
          )}
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              <div className="chat-avatar">
                {msg.type === 'agent' ? '🤖' : user?.name?.[0] || '👤'}
              </div>
              <div style={{ maxWidth: '100%' }}>
                <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                
                {msg.kbSources && msg.kbSources.length > 0 && (
                  <div className="chat-kb-sources">
                    {msg.kbSources.map((src, i) => (
                      <span key={i} className="chat-kb-tag">📋 {src.id} — {src.title}</span>
                    ))}
                  </div>
                )}

                {msg.status && msg.type === 'agent' && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                    <span className={`badge badge-status badge-${msg.status}`}>
                      {msg.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                {/* Follow-up suggestion chips — only on the LAST agent message */}
                {msg.type === 'agent' && index === messages.length - 1 && activeFollowUps.length > 0 && !sending && (
                  <div className="followup-chips">
                    <div className="followup-label">💡 Suggested responses:</div>
                    <div className="followup-chips-list">
                      {activeFollowUps.map((q, i) => (
                        <button
                          key={i}
                          className="followup-chip"
                          onClick={() => handleFollowUpClick(q)}
                          title={`Click to answer: ${q}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="chat-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-message agent">
              <div className="chat-avatar">🤖</div>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {currentTicketCode && (
            <div className="chat-ticket-info">
              🎫 Continuing conversation on ticket <strong>{currentTicketCode}</strong>
            </div>
          )}
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Describe your IT issue..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

