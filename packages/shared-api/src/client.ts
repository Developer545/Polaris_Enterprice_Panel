import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

let apiClient: AxiosInstance | null = null
const TENANT_SLUG_KEY = 'pos_dte_tenant_slug'

function getApiUrl(): string {
  if (typeof window !== 'undefined' && (window as any).__API_URL__) {
    return (window as any).__API_URL__
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
}

export function setTenantSlug(slug: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TENANT_SLUG_KEY, slug)
    // Update existing client headers if already created
    if (apiClient) {
      apiClient.defaults.headers.common['X-Tenant-Slug'] = slug
    }
  }
}

export function getTenantSlug(): string {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(TENANT_SLUG_KEY) ?? ''
  }
  return ''
}

export function createApiClient(): AxiosInstance {
  if (apiClient) return apiClient

  const slug = getTenantSlug()

  apiClient = axios.create({
    baseURL: getApiUrl(),
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(slug ? { 'X-Tenant-Slug': slug } : {}),
    },
    timeout: 15_000,
  })

  // Inject X-Tenant-Slug dynamically on every request
  apiClient.interceptors.request.use((config) => {
    const currentSlug = getTenantSlug()
    if (currentSlug) {
      config.headers['X-Tenant-Slug'] = currentSlug
    }
    return config
  })

  // Response interceptor — handle 401 (token expired)
  apiClient.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status === 401 && !original._retry) {
        original._retry = true
        try {
          await apiClient!.post('/api/auth/refresh')
          return apiClient!(original)
        } catch {
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }

      return Promise.reject(error)
    },
  )

  return apiClient
}

export function getClient(): AxiosInstance {
  return createApiClient()
}

export function resetApiClient(): void {
  apiClient = null
}
