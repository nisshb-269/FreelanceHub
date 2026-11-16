import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('freelancehub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    localStorage.removeItem('freelancehub_token');
    localStorage.removeItem('freelancehub_user');
    window.dispatchEvent(new Event('freelancehub:logout'));
  }
  return Promise.reject(error);
});
export const errorMessage = (error) => error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
export default api;
