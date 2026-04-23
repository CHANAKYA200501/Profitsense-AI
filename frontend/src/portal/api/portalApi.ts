/**
 * Portal API Client
 * All API calls include CSRF token header.
 * Handles token refresh automatically.
 */

const API_BASE = `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/portal`;

function getHeaders(): Record<string, string> {
  const csrf = sessionStorage.getItem('portal_csrf') || '';
  const token = sessionStorage.getItem('portal_token') || '';
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    // Try silent refresh
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.access_token) {
          sessionStorage.setItem('portal_token', data.access_token);
          return null; // Signal to retry
        }
      }
    } catch {
      // Refresh failed
    }
    sessionStorage.removeItem('portal_user');
    sessionStorage.removeItem('portal_csrf');
    sessionStorage.removeItem('portal_token');
    window.location.href = '/portal/login';
    throw new Error('Session expired');
  }
  return res.json();
}

export const portalApi = {
  // ── Auth ─────────────────────────────────────────────────────────
  async register(data: {
    name: string; email: string; dob: string;
    password: string; confirm_password: string; terms_accepted: boolean;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    return res.json();
  },

  async adminLogin(email: string, password: string, totp_code: string) {
    const res = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp_code }),
      credentials: 'include',
    });
    return res.json();
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
    });
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async changePassword(data: { current_password: string; new_password: string; confirm_password: string }) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  // ── Dashboard ────────────────────────────────────────────────────
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getDashboardActivity(limit = 50) {
    const res = await fetch(`${API_BASE}/dashboard/activity?limit=${limit}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Users ────────────────────────────────────────────────────────
  async getUsers(params: Record<string, string | number> = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await fetch(`${API_BASE}/users?${qs}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async updateUserStatus(id: string, status: string, reason?: string) {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async bulkAction(user_ids: string[], action: string, reason?: string) {
    const res = await fetch(`${API_BASE}/users/bulk-action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_ids, action, reason }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── KYC ──────────────────────────────────────────────────────────
  async submitKyc(formData: FormData) {
    const token = sessionStorage.getItem('portal_token') || '';
    const res = await fetch(`${API_BASE}/kyc/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      credentials: 'include',
    });
    return res.json();
  },

  async getPendingKyc(page = 1) {
    const res = await fetch(`${API_BASE}/kyc/pending?page=${page}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async reviewKyc(id: string, decision: string, rejection_reason?: string) {
    const res = await fetch(`${API_BASE}/kyc/${id}/review`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ decision, rejection_reason }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getKycStatus() {
    const res = await fetch(`${API_BASE}/kyc/status`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Phishing ─────────────────────────────────────────────────────
  async scanContent(url?: string, content?: string) {
    const res = await fetch(`${API_BASE}/security/scan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, content }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getPhishingLogs(page = 1, status?: string) {
    let url = `${API_BASE}/phishing/logs?page=${page}`;
    if (status) url += `&status=${status}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getPhishingStats() {
    const res = await fetch(`${API_BASE}/phishing/stats`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async phishingAction(id: string, action: string, notes?: string) {
    const res = await fetch(`${API_BASE}/phishing/${id}/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, notes }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Logs ─────────────────────────────────────────────────────────
  async getAuditLogs(params: Record<string, string | number> = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await fetch(`${API_BASE}/logs/audit?${qs}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getSystemLogs(lines = 100) {
    const res = await fetch(`${API_BASE}/logs/system?lines=${lines}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Notifications ────────────────────────────────────────────────
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Reports ──────────────────────────────────────────────────────
  async generateReport(type: string, format = 'csv', dateFrom?: string, dateTo?: string) {
    let url = `${API_BASE}/reports/generate?report_type=${type}&format=${format}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return res;
  },

  // ── Profile ──────────────────────────────────────────────────────
  async getProfile() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async updateProfile(data: { name?: string; dob?: string }) {
    const res = await fetch(`${API_BASE}/auth/update-profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getLoginHistory() {
    const res = await fetch(`${API_BASE}/login-history`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },
};
