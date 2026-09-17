const BASE_URL = '/api';

let authToken = localStorage.getItem('veridian_token');

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

const api = {
  setToken: (token) => { authToken = token; },

  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (userData) => request('POST', '/auth/register', userData),
  getMe: () => request('GET', '/auth/me'),

  // Agent
  sendMessage: (message, ticketId) => request('POST', '/agent/chat', { message, ticketId }),
  getConversation: (ticketId) => request('GET', `/agent/conversation/${ticketId}`),
  trainModel: () => request('POST', '/agent/train'),
  getTrainStatus: () => request('GET', '/agent/train/status'),

  // Tickets
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/tickets?${query}`);
  },
  getTicket: (id) => request('GET', `/tickets/${id}`),
  updateTicket: (id, data) => request('PUT', `/tickets/${id}`, data),

  // Knowledge Base
  getKBArticles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/kb?${query}`);
  },
  getKBArticle: (id) => request('GET', `/kb/${id}`),
  createKBArticle: (data) => request('POST', '/kb', data),
  updateKBArticle: (id, data) => request('PUT', `/kb/${id}`, data),
  deleteKBArticle: (id) => request('DELETE', `/kb/${id}`),

  // Dashboard
  getDashboardStats: () => request('GET', '/dashboard/stats'),
  getDashboardTrends: () => request('GET', '/dashboard/trends'),

  // Users
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/users?${query}`);
  },
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/users/${id}`),
};

export default api;
