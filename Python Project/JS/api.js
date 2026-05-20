const API_BASE = 'http://localhost:5000/api';

async function apiCall(method, endpoint, data = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (data) opts.body = JSON.stringify(data);
  try {
    const res = await fetch(API_BASE + endpoint, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  } catch (e) {
    throw e;
  }
}

const api = {
  get: (ep) => apiCall('GET', ep),
  post: (ep, d) => apiCall('POST', ep, d),
  put: (ep, d) => apiCall('PUT', ep, d),
  delete: (ep, d) => apiCall('DELETE', ep, d),
};