/**
 * User Management Table
 * - Paginated, sortable, filterable
 * - Columns: ID, name, email, KYC status, account status, last login, actions
 * - Row actions: View Profile, Suspend, Block, Delete with confirmation
 * - Bulk actions: select multiple → bulk suspend/delete
 * - User detail modal
 */
import React, { useState, useEffect, useCallback } from 'react';
import { portalApi } from '../../api/portalApi';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/15 text-emerald-600 border-emerald-200',
  pending_kyc: 'bg-yellow-500/15 text-amber-500 border-amber-200',
  suspended: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  blocked: 'bg-red-500/15 text-red-600 border-red-500/20',
};

const kycColors: Record<string, string> = {
  approved: 'bg-green-500/15 text-emerald-600',
  pending: 'bg-yellow-500/15 text-amber-500',
  rejected: 'bg-red-500/15 text-red-600',
  not_submitted: 'bg-gray-700/50 text-slate-400',
};

const Badge = ({ label, className }: { label: string; className: string }) => (
  <span className={`px-2 py-0.5 rounded-md text-sm font-bold tracking-wider border ${className}`}>
    {label.replace('_', ' ')}
  </span>
);

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUserModal, setShowUserModal] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: string; userId: string; userName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await portalApi.getUsers(params);
      if (data?.users) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, perPage, search, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(true);
    try {
      if (action === 'delete') {
        await portalApi.deleteUser(userId);
      } else {
        await portalApi.updateUserStatus(userId, action);
      }
      await loadUsers();
    } catch { /* ignore */ }
    setActionLoading(false);
    setConfirmAction(null);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await portalApi.bulkAction(Array.from(selectedIds), action);
      setSelectedIds(new Set());
      await loadUsers();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const viewUserDetail = async (userId: string) => {
    try {
      const data = await portalApi.getUser(userId);
      if (data?.user) setShowUserModal(data.user);
    } catch { /* ignore */ }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-64 transition"
          aria-label="Search users"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition"
          aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending_kyc">Pending KYC</option>
          <option value="suspended">Suspended</option>
          <option value="blocked">Blocked</option>
        </select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
            <button onClick={() => handleBulkAction('suspend')}
              className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition">
              Bulk Suspend
            </button>
            <button onClick={() => handleBulkAction('delete')}
              className="px-3 py-2 bg-red-50 border border-red-500/20 rounded-lg text-red-600 text-xs font-bold hover:bg-red-50 transition">
              Bulk Delete
            </button>
          </div>
        )}

        <button onClick={loadUsers} className="ml-auto px-3 py-2.5 bg-slate-100/60 rounded-xl text-slate-500 hover:text-slate-900 text-xs transition border border-gray-700/50">
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 tracking-wider">
                <th className="text-left px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === users.length && users.length > 0}
                    onChange={toggleAll} className="rounded border-gray-600 bg-slate-100 text-indigo-500" aria-label="Select all" />
                </th>
                <th className="text-left px-4 py-3 font-bold">ID</th>
                <th className="text-left px-4 py-3 font-bold">Name</th>
                <th className="text-left px-4 py-3 font-bold">Email</th>
                <th className="text-left px-4 py-3 font-bold">KYC</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-left px-4 py-3 font-bold">Last Login</th>
                <th className="text-right px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No users found</td></tr>
              ) : (
                users.map((u, i) => (
                  <tr key={u.id} className={`border-t border-slate-200/40 hover:bg-slate-100/20 transition ${i % 2 ? 'bg-[#080e1e]' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)} className="rounded border-gray-600 bg-slate-100 text-indigo-500"
                        aria-label={`Select ${u.name}`} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{u.id?.substring(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={u.kyc_status || 'none'} className={kycColors[u.kyc_status] || kycColors.not_submitted} /></td>
                    <td className="px-4 py-3"><Badge label={u.status || 'unknown'} className={statusColors[u.status] || ''} /></td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewUserDetail(u.id)} title="View Profile"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition" aria-label="View Profile">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {u.role !== 'admin' && (
                          <>
                            <button onClick={() => setConfirmAction({ action: 'suspended', userId: u.id, userName: u.name || u.email })} title="Suspend"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition" aria-label="Suspend user">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button onClick={() => setConfirmAction({ action: 'blocked', userId: u.id, userName: u.name || u.email })} title="Block"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" aria-label="Block user">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </button>
                            <button onClick={() => setConfirmAction({ action: 'delete', userId: u.id, userName: u.name || u.email })} title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" aria-label="Delete user">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/40">
          <span className="text-[10px] text-slate-400">{total} total users • Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 hover:bg-slate-100 disabled:opacity-30 transition">
              ← Prev
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 hover:bg-slate-100 disabled:opacity-30 transition">
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm {confirmAction.action === 'delete' ? 'Delete' : confirmAction.action === 'blocked' ? 'Block' : 'Suspend'}</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to {confirmAction.action === 'delete' ? 'permanently delete' : confirmAction.action} <strong className="text-slate-900">{confirmAction.userName}</strong>?
              {confirmAction.action === 'delete' && ' This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={() => handleAction(confirmAction.userId, confirmAction.action)} disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                  confirmAction.action === 'delete' ? 'bg-red-600 hover:bg-red-500 text-slate-900' : 'bg-orange-600 hover:bg-orange-500 text-slate-900'
                }`}>
                {actionLoading ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">User Profile</h3>
              <button onClick={() => setShowUserModal(null)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Name', showUserModal.name],
                ['Email', showUserModal.email],
                ['Role', showUserModal.role],
                ['Status', showUserModal.status],
                ['DOB', showUserModal.dob],
                ['Created', new Date(showUserModal.created_at).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 tracking-wider block mb-1">{label}</span>
                  <span className="text-slate-900 font-medium">{val || '—'}</span>
                </div>
              ))}
            </div>

            {/* Login History */}
            {showUserModal.login_history?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold text-slate-500 tracking-wider mb-3">Recent Logins</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {showUserModal.login_history.map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100/20 text-xs">
                      <span className={`w-2 h-2 rounded-full ${l.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-slate-500 font-mono">{l.created_at?.substring(0, 19).replace('T', ' ')}</span>
                      <span className="text-slate-400">{l.ip_address}</span>
                      {l.failure_reason && <span className="text-red-600 ml-auto">{l.failure_reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
