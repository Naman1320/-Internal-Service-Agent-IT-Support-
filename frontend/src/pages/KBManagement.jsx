import { useState, useEffect } from 'react';
import api from '../services/api';

export default function KBManagement() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form, setForm] = useState({
    kb_id: '', title: '', category: 'Account Access', content: '',
    keywords: '', requires_approval: false, auto_resolvable: false, escalation_required: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    try {
      const data = await api.getKBArticles();
      setArticles(data.articles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingArticle(null);
    setForm({ kb_id: '', title: '', category: 'Account Access', content: '', keywords: '', requires_approval: false, auto_resolvable: false, escalation_required: false });
    setError('');
    setShowModal(true);
  };

  const openEdit = (article) => {
    setEditingArticle(article);
    let kw = '';
    try { kw = JSON.parse(article.keywords).join(', '); } catch (e) {}
    setForm({
      kb_id: article.kb_id, title: article.title, category: article.category,
      content: article.content, keywords: kw,
      requires_approval: !!article.requires_approval,
      auto_resolvable: !!article.auto_resolvable,
      escalation_required: !!article.escalation_required
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const payload = { ...form, keywords };

      if (editingArticle) {
        await api.updateKBArticle(editingArticle.id, payload);
      } else {
        if (!form.kb_id) { setError('KB ID is required.'); setSaving(false); return; }
        await api.createKBArticle(payload);
      }
      setShowModal(false);
      fetchArticles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article) => {
    if (!confirm(`Delete ${article.kb_id} — ${article.title}?`)) return;
    try {
      await api.deleteKBArticle(article.id);
      fetchArticles();
    } catch (err) {
      alert(err.message);
    }
  };

  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      const res = await api.trainModel();
      setTrainStatus(res.metrics);
      alert(`🤖 AI Agent Model Trained Successfully!\n\n• KB Articles Indexed: ${res.metrics.indexedArticles}\n• Historical Precedents Trained: ${res.metrics.historicalTicketsTrained}\n• Vocabulary Size: ${res.metrics.vocabularySize} tokens`);
    } catch (err) {
      alert('Training failed: ' + err.message);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Knowledge Base Management</h1>
          <p>Create, edit, and train the AI Model on IT policy articles & precedents</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button className="btn btn-secondary" onClick={handleTrainModel} disabled={training}>
            {training ? '⏳ Training Model...' : '⚡ Re-Train AI Model'}
          </button>
          <button className="btn btn-primary" onClick={openNew}>➕ New Article</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>KB ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Flags</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article.id}>
                  <td><span className="ticket-card-id">{article.kb_id}</span></td>
                  <td style={{ fontWeight: 500 }}>{article.title}</td>
                  <td><span className="badge badge-info">{article.category}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {article.auto_resolvable ? <span className="badge badge-success">Auto</span> : null}
                      {article.requires_approval ? <span className="badge badge-warning">Approval</span> : null}
                      {article.escalation_required ? <span className="badge badge-error">Escalate</span> : null}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{new Date(article.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(article)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(article)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingArticle ? 'Edit Article' : 'New Article'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="auth-error"><span>⚠</span> {error}</div>}

              {!editingArticle && (
                <div className="form-group">
                  <label className="form-label">KB ID</label>
                  <input className="form-input" placeholder="KB-11" value={form.kb_id} onChange={(e) => setForm(f => ({ ...f, kb_id: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Article title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option>Account Access</option>
                  <option>Network Access</option>
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Email</option>
                  <option>Security</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-textarea" rows={5} placeholder="Article content..." value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Keywords (comma-separated)</label>
                <input className="form-input" placeholder="keyword1, keyword2, ..." value={form.keywords} onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.auto_resolvable} onChange={(e) => setForm(f => ({ ...f, auto_resolvable: e.target.checked }))} />
                  Auto-resolvable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.requires_approval} onChange={(e) => setForm(f => ({ ...f, requires_approval: e.target.checked }))} />
                  Requires Approval
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.escalation_required} onChange={(e) => setForm(f => ({ ...f, escalation_required: e.target.checked }))} />
                  Escalation Required
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingArticle ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
