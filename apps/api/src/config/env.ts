import { z } from 'zod'

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Databases
  CONTROL_PLANE_DATABASE_URL: z.string().url(),
  SHARED_TENANT_DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ADMIN_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DTE_QUEUE_DRIVER: z.enum(['bullmq', 'local']).default('bullmq'),

  // Encryption (AES-256 for dbUrl and Hacienda credentials)
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex

  // Licenses — HMAC secret para hashear claves de licencia
  // CAMBIAR en producción. Sin este secreto es imposible validar licencias aunque roben la BD.
  LICENSE_HMAC_SECRET: z.string().min(16).default('dev-license-hmac-secret-change-in-production'),

  // Local desktop bundle (IS_LOCAL_BUNDLE=1 en Electron)
  IS_LOCAL_BUNDLE: z.string().optional(),
  // Ruta al JSON de permisos escrito por el proceso Electron principal
  LOCAL_PERMISSIONS_FILE: z.string().optional(),

  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().email().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  _env = result.data
  return _env
}

export function useBullDteQueue(): boolean {
  return (process.env.DTE_QUEUE_DRIVER ?? 'bullmq') === 'bullmq'
}

export function useLocalMemoryCache(): boolean {
  return (process.env.DTE_QUEUE_DRIVER ?? 'bullmq') === 'local' || process.env.REDIS_URL === 'memory://local'
}
