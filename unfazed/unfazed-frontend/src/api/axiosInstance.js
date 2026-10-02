import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unfazed_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiError = (error) => {
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')) {
    return 'Cannot reach the Unfazed API. From the parent unfazed folder, run npm run dev and wait for both the API on port 5000 and Vite on port 5173.';
  }
  return error?.response?.data?.error?.message || error?.message || 'Something went wrong. Please try again.';
};
export default api;
