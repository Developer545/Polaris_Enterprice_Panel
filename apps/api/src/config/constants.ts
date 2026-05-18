export const TENANT_HEADER = 'x-tenant-slug'
export const ADMIN_COOKIE = 'admin_token'
export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60        // 15 min
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600 // 7 days
export const ADMIN_TOKEN_TTL_SECONDS = 4 * 3600         // 4 hours

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_MINUTES = 15

export const TENANT_CACHE_TTL = 60 // seconds in Redis
export const HACIENDA_TOKEN_TTL = 82800 // 23 hours (< 24h official)

export const DTE_QUEUE = 'dte'
export const DTE_JOB_SIGN_AND_SEND = 'sign-and-send'
export const DTE_JOB_RETRY = 'retry'
export const DTE_MAX_RETRIES = 5

// Hacienda API endpoints
export const HACIENDA_AUTH_TEST = 'https://apifacturatest.mh.gob.sv/auth'
export const HACIENDA_AUTH_PROD = 'https://apifactura.mh.gob.sv/auth'
export const HACIENDA_RECV_TEST = 'https://apifacturatest.mh.gob.sv/fesv/recepciondte'
export const HACIENDA_RECV_PROD = 'https://apifactura.mh.gob.sv/fesv/recepciondte'
