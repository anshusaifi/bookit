// src/api.js
// Axios instance — uses relative /api path so Vite's dev proxy handles routing.

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
