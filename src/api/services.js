import api from './client';

// ====================
// AUTH
// ====================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ====================
// USERS
// ====================
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ====================
// COMPANIES
// ====================
export const companiesAPI = {
  list: (params) => api.get('/companies', { params }),
  get: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// ====================
// PROJECTS
// ====================
export const projectsAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  stats: (id) => api.get(`/projects/${id}/stats`),
};

// ====================
// UNITS
// ====================
export const unitsAPI = {
  list: (params) => api.get('/units', { params }),
  get: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.patch(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// ====================
// ASSIGNMENTS
// ====================
export const assignmentsAPI = {
  list: (params) => api.get('/assignments', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.patch(`/assignments/${id}`, data),
};

// ====================
// PAYMENTS
// ====================
export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.patch(`/payments/${id}`, data),
};

// ====================
// PROGRESS
// ====================
export const progressAPI = {
  list: (params) => api.get('/progress', { params }),
  create: (data) => api.post('/progress', data),
  update: (id, data) => api.patch(`/progress/${id}`, data),
};

// ====================
// DOCUMENTATION
// ====================
export const documentationAPI = {
  list: (params) => api.get('/documentation', { params }),
  get: (id) => api.get(`/documentation/${id}`),
  upload: (formData) =>
    api.post('/documentation', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  delete: (id) => api.delete(`/documentation/${id}`),
};

// ====================
// TICKETS
// ====================
export const ticketsAPI = {
  list: (params) => api.get('/tickets', { params }),
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.patch(`/tickets/${id}`, data),
};

// ====================
// DASHBOARD
// ====================
export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  customerService: () =>
    api.get('/dashboard/customer-service'),
  globalAnalytics: () =>
    api.get('/dashboard/analytics/global'),
};