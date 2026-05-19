import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const TENANT_SLUG_KEY = 'pos_dte_tenant_slug'

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).__API_URL__) {
    return (window as any).__API_URL__
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
}

function getTenantSlug(): string {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(TENANT_SLUG_KEY) ?? ''
  }
  return ''
}

export const api = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Set baseURL + X-Tenant-Slug dynamically on every request
api.interceptors.request.use((config) => {
  if (!config.baseURL) config.baseURL = getBaseUrl()
  const slug = getTenantSlug()
  if (slug) config.headers['X-Tenant-Slug'] = slug
  return config
})

// Silent refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        await api.post('/api/auth/refresh')
        return api(original)
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
