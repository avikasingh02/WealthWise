import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Token storage ──────────────────────────────────────────────────────────
let _accessToken: string | null = null
let _refreshToken: string | null = null

export function setTokens(access: string, refresh: string) {
  _accessToken = access
  _refreshToken = refresh
  localStorage.setItem('ww_refresh', refresh)
}

export function clearTokens() {
  _accessToken = null
  _refreshToken = null
  localStorage.removeItem('ww_refresh')
}

export function getAccessToken() {
  return _accessToken
}

export function loadRefreshToken() {
  _refreshToken = localStorage.getItem('ww_refresh')
  return _refreshToken
}

// ── Request interceptor — attach bearer token ───────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

// ── Response interceptor — refresh on 401 ──────────────────────────────────
let _refreshing: Promise<void> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry && _refreshToken) {
      original._retry = true
      if (!_refreshing) {
        _refreshing = (async () => {
          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
              refresh_token: _refreshToken,
            })
            setTokens(data.access_token, data.refresh_token)
          } catch {
            clearTokens()
            window.location.href = '/login'
          } finally {
            _refreshing = null
          }
        })()
      }
      await _refreshing
      return api(original)
    }
    return Promise.reject(error)
  }
)

// ── Auth endpoints ──────────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/login', { email, password }),

  me: () => api.get<{ id: string; name: string; email: string; role: string }>('/auth/me'),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refresh_token: refreshToken }),
}

// ── Analytics endpoints ─────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: (period?: string) =>
    api.get('/analytics/dashboard', { params: { period } }),
  categories: (period?: string) =>
    api.get('/analytics/categories', { params: { period } }),
  trends: (months = 6) =>
    api.get('/analytics/trends', { params: { months } }),
  healthScore: (period?: string) =>
    api.get('/analytics/health-score', { params: { period } }),
  forecast: (months = 1) =>
    api.get('/analytics/forecast', { params: { months } }),
}

// ── Upload endpoints ────────────────────────────────────────────────────────
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  status: (jobId: string) => api.get(`/uploads/${jobId}`),
}

// ── Transactions endpoints ──────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: { from?: string; to?: string; category?: string; limit?: number; offset?: number }) =>
    api.get('/transactions', { params }),
}

// ── Budget endpoints ────────────────────────────────────────────────────────
export const budgetApi = {
  list: (period?: string) => api.get('/budgets', { params: { period } }),
  create: (body: { category_id: string; monthly_limit: number; period: string }) =>
    api.post('/budgets', body),
  update: (id: string, monthly_limit: number) => api.patch(`/budgets/${id}`, { monthly_limit }),
  delete: (id: string) => api.delete(`/budgets/${id}`),
}
