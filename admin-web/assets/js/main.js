const API_BASE = 'http://localhost:5000';
const tokenKey = 'admin_token';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem(tokenKey);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

async function ensureLogin() {
  let t = localStorage.getItem(tokenKey);
  if (!t) {
    // Try default admin demo login
    try {
      const res = await api.post('/api/auth/login', { email: 'admin@example.com', password: 'password123' });
      localStorage.setItem(tokenKey, res.data.token);
    } catch (e) {
      alert('Login required. Please set up backend and credentials.');
      throw e;
    }
  }
}

ensureLogin();
