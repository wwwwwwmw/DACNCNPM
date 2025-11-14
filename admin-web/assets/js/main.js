// Base URL strategy:
// - If running behind ngrok (https domain), use same-origin (location.origin)
// - Allow override via localStorage('api_base') or window.API_BASE_OVERRIDE
// - For local dev, same-origin (http://localhost:PORT) works since admin is served by backend
const API_BASE = (window.API_BASE_OVERRIDE
  || localStorage.getItem('api_base')
  || location.origin);
const tokenKey = 'admin_token';
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem(tokenKey);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
async function loginWith(email, password) {
  const res = await api.post('/api/auth/login', { email, password });
  localStorage.setItem(tokenKey, res.data.token);
  return res.data;
}
async function ensureLogin() {
  const t = localStorage.getItem(tokenKey);
  if (!t) {
    // demo auto login
    await loginWith('admin@example.com', 'password123').catch(()=>{});
  }
}
function logout() {
  localStorage.removeItem(tokenKey);
  location.reload();
}
ensureLogin();
