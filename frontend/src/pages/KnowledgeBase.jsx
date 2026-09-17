import { useState, useEffect } from 'react';
import api from '../services/api';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, [search, category]);

  const fetchArticles = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'all') params.category = category;
      const data = await api.getKBArticles(params);
      setArticles(data.articles);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(articles.map(a => a.category))];

  const categoryColors = {
    'Account Access': '#3b82f6',
    'Network Access': '#8b5cf6',
    'Hardware': '#f59e0b',
    'Software': '#22c55e',
    'Email': '#ec4899',
    'Security': '#ef4444',
  };

  return (
    <div>
      <div className="page-header">
        <h1>Knowledge Base</h1>
        <p>IT policies, procedures, and troubleshooting guides</p>
      </div>

      <div className="filter-bar">
        <input
          className="form-input search-input"
          placeholder="🔍 Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <div className="kb-grid">
          {articles.map(article => (
            <div key={article.id} className="kb-card" onClick={() => setSelectedArticle(article)}>
              <span className="kb-card-id">{article.kb_id}</span>
              <h3>{article.title}</h3>
              <p>{article.content}</p>
              <div className="kb-card-footer">
                <span className="kb-badge" style={{
                  background: `${categoryColors[article.category] || '#6366f1'}22`,
                  color: categoryColors[article.category] || '#6366f1'
                }}>
                  {article.category}
                </span>
                {article.auto_resolvable ? (
                  <span className="kb-badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Auto-resolve</span>
                ) : null}
                {article.requires_approval ? (
                  <span className="kb-badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Requires Approval</span>
                ) : null}
                {article.escalation_required ? (
                  <span className="kb-badge" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>Escalation</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedArticle.kb_id} — {selectedArticle.title}</h3>
              <button className="modal-close" onClick={() => setSelectedArticle(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span className="badge badge-info">{selectedArticle.category}</span>
              </div>
              <p style={{ lineHeight: 1.7, fontSize: '14px', color: 'var(--text-secondary)' }}>
                {selectedArticle.content}
              </p>
              {selectedArticle.keywords && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {JSON.parse(selectedArticle.keywords).map((kw, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', fontSize: '11px', background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)'
                      }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
