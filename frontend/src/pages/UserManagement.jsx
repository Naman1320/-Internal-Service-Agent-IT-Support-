import { useState, useEffect } from 'react';
import api from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      const data = await api.getUsers(params);
      setUsers(data.users);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const changeRole = async (user, newRole) => {
    if (!confirm(`Change ${user.name}'s role to ${newRole}?`)) return;
    try {
      await api.updateUser(user.id, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to permanently delete user account ${user.name} (${user.email})?`)) return;
    try {
      await api.deleteUser(user.id);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage employee accounts, roles, and user deletions</p>
      </div>

      <div className="filter-bar">
        <input
          className="form-input search-input"
          placeholder="🔍 Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Type</th>
                <th>Tickets</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><span className="ticket-card-id">{u.employee_id}</span></td>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>{u.department}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>{u.employment_type}</td>
                  <td style={{ textAlign: 'center' }}>{u.ticket_count}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleActive(u)}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active ? '🔒' : '🔓'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => changeRole(u, u.role === 'admin' ? 'employee' : 'admin')}
                        title={u.role === 'admin' ? 'Demote to Employee' : 'Promote to Admin'}
                      >
                        {u.role === 'admin' ? '⬇️' : '⬆️'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteUser(u)}
                        title="Delete User Account"
                        style={{ color: 'var(--accent-red)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
