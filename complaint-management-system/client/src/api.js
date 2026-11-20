let refreshing = null;

async function refreshSession() {
  const r = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!r.ok) throw new Error('expired');
  localStorage.setItem('token', (await r.json()).token);
}

export async function api(path, { method = 'GET', body, form } = {}, retry = true) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { method, headers, body: form || (body && JSON.stringify(body)) });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      refreshing = refreshing || refreshSession().finally(() => { refreshing = null; });
      await refreshing;
      return api(path, { method, body, form }, false);
    } catch {
      localStorage.clear();
      location.reload();
      throw new Error('Your session expired. Please log in again.');
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
