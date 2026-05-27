import { app } from 'electron'
import { spawn, execSync, type ChildProcess } from 'child_process'
import net from 'net'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import { randomBytes } from 'crypto'

type LocalServiceConfig = {
  apiPort?: number
  webPort?: number
  dteQueueDriver?: 'local' | 'bullmq'
  postgres?: {
    host?: string
    port?: number
    user?: string
    password?: string
    controlDatabase?: string
    tenantDatabase?: string
  }
  redis?: {
    host?: string
    port?: number
  }
  controlPlaneDatabaseUrl?: string
  sharedTenantDatabaseUrl?: string
  redisUrl?: string
  corsOrigins?: string
  backupDir?: string
  pgDumpPath?: string
  jwtAccessSecret?: string
  jwtRefreshSecret?: string
  jwtAdminSecret?: string
  encryptionKey?: string
  localSetupToken?: string
}

type LocalServices = {
  apiUrl: string
  webUrl: string
  stop: () => void
}

const children: ChildProcess[] = []

export function isLocalBundle(): boolean {
  if (process.env.POS_DTE_LOCAL_BUNDLE === '1') return true
  return app.isPackaged && fs.existsSync(path.join(process.resourcesPath, 'local', 'api', 'dist', 'main.js'))
}

export async function startLocalServices(): Promise<LocalServices> {
  const localRoot = getLocalRoot()
  const config = readLocalServiceConfig(localRoot)
  const apiPort = config.apiPort ?? 4000
  const webPort = config.webPort ?? 3010
  const localSetupToken = config.localSetupToken ?? randomBytes(32).toString('hex')
  process.env.LOCAL_SETUP_TOKEN = localSetupToken
  await assertPortFree(apiPort)
  await assertPortFree(webPort)
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const webUrl = `http://127.0.0.1:${webPort}`

  const nodePath = path.join(localRoot, 'node_modules')
  const baseEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    NODE_PATH: [nodePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
  }

  const apiEntry = path.join(localRoot, 'api', 'dist', 'main.js')
  if (!fs.existsSync(apiEntry)) throw new Error(`Local API entry not found: ${apiEntry}`)

  const apiEnv = {
    ...baseEnv,
    IS_LOCAL_BUNDLE: '1',
    PORT: String(apiPort),
    CORS_ORIGINS: config.corsOrigins ?? `${webUrl},http://localhost:${webPort}`,
    CONTROL_PLANE_DATABASE_URL: config.controlPlaneDatabaseUrl ?? buildPostgresUrl(config, 'control'),
    SHARED_TENANT_DATABASE_URL: config.sharedTenantDatabaseUrl ?? buildPostgresUrl(config, 'tenant'),
    DTE_QUEUE_DRIVER: config.dteQueueDriver ?? 'local',
    REDIS_URL: config.redisUrl ?? (config.dteQueueDriver === 'bullmq' ? buildRedisUrl(config) : 'memory://local'),
    JWT_ACCESS_SECRET: config.jwtAccessSecret ?? 'local-access-secret-change-before-production',
    JWT_REFRESH_SECRET: config.jwtRefreshSecret ?? 'local-refresh-secret-change-before-production',
    JWT_ADMIN_SECRET: config.jwtAdminSecret ?? 'local-admin-secret-change-before-production',
    ENCRYPTION_KEY: config.encryptionKey ?? '1111111111111111111111111111111111111111111111111111111111111111',
    // Ruta del archivo JSON de permisos escrito por el proceso Electron principal
    LOCAL_PERMISSIONS_FILE: process.env.LOCAL_PERMISSIONS_FILE ?? '',
    LOCAL_SETUP_TOKEN: localSetupToken,
    LOCAL_BACKUP_DIR: config.backupDir ?? path.join(app.getPath('documents'), 'Polaris Backups'),
    ...(config.pgDumpPath ? { PG_DUMP_PATH: config.pgDumpPath } : {}),
  }

  await runLocalMigrations(localRoot, 'control-plane', apiEnv.CONTROL_PLANE_DATABASE_URL)
  await runLocalMigrations(localRoot, 'tenant', apiEnv.SHARED_TENANT_DATABASE_URL)

  children.push(spawnService('api', apiEntry, [], {
    cwd: path.join(localRoot, 'api'),
    env: apiEnv,
  }))

  await waitForUrl(`${apiUrl}/api/health`, 30_000)

  const webEntry = path.join(localRoot, 'web', 'standalone', 'apps', 'web', 'server.js')
  if (!fs.existsSync(webEntry)) throw new Error(`Local web entry not found: ${webEntry}`)

  children.push(spawnService('web', webEntry, [], {
    cwd: path.dirname(webEntry),
    env: {
      ...baseEnv,
      PORT: String(webPort),
      HOSTNAME: '127.0.0.1',
      NEXT_PUBLIC_API_URL: apiUrl,
    },
  }))

  await waitForUrl(webUrl, 60_000)

  return { apiUrl, webUrl, stop: stopLocalServices }
}

function buildPostgresUrl(config: LocalServiceConfig, database: 'control' | 'tenant'): string {
  const pg = config.postgres ?? {}
  const host = pg.host ?? '127.0.0.1'
  const port = pg.port ?? 5432
  const user = pg.user ?? 'pos_dte'
  const password = pg.password ?? 'pos_dte_local_password'
  const databaseName = database === 'control'
    ? (pg.controlDatabase ?? 'pos_dte_control')
    : (pg.tenantDatabase ?? 'pos_dte_tenant')

  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
  return `postgresql://${auth}@${host}:${port}/${databaseName}?schema=public`
}

function buildRedisUrl(config: LocalServiceConfig): string {
  const redis = config.redis ?? {}
  return `redis://${redis.host ?? '127.0.0.1'}:${redis.port ?? 6379}`
}

export function stopLocalServices(): void {
  for (const child of children.splice(0)) {
    if (!child.killed) child.kill()
  }
}

function getLocalRoot(): string {
  if (process.env.POS_DTE_LOCAL_ROOT) return process.env.POS_DTE_LOCAL_ROOT
  if (app.isPackaged) return path.join(process.resourcesPath, 'local')
  return findWorkspaceRoot()
}

function findWorkspaceRoot(): string {
  const starts = [process.cwd(), app.getAppPath(), __dirname]
  for (const start of starts) {
    let dir = path.resolve(start)
    while (dir !== path.dirname(dir)) {
      if (
        fs.existsSync(path.join(dir, 'package.json')) &&
        fs.existsSync(path.join(dir, 'apps', 'api')) &&
        fs.existsSync(path.join(dir, 'apps', 'web'))
      ) {
        return dir
      }
      dir = path.dirname(dir)
    }
  }
  return path.resolve(__dirname, '../../../..')
}

function readLocalServiceConfig(localRoot: string): LocalServiceConfig {
  const candidates = [
    path.join(localRoot, 'local-server.json'),
    path.join(process.resourcesPath ?? '', 'local-server.json'),
    app.isReady() ? path.join(app.getPath('userData'), 'local-server.json') : '',
  ].filter(Boolean)

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      return JSON.parse(fs.readFileSync(file, 'utf8')) as LocalServiceConfig
    } catch {
      // Keep defaults when the optional local server config is missing or malformed.
    }
  }
  return {}
}

function spawnService(
  name: string,
  script: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): ChildProcess {
  const child = spawn(process.execPath, [script, ...args], {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (chunk) => console.log(`[local:${name}] ${chunk}`.trim()))
  child.stderr?.on('data', (chunk) => console.error(`[local:${name}] ${chunk}`.trim()))
  child.on('exit', (code, signal) => console.warn(`[local:${name}] exited code=${code} signal=${signal}`))
  return child
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status < 500) return
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`)
}

/**
 * Verifica que el puerto esté libre. Si está ocupado, intenta matar el proceso
 * que lo usa (proceso huérfano de una ejecución anterior que crasheó).
 * Reintenta 3 veces con pausa de 1 segundo entre intentos.
 */
async function assertPortFree(port: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const free = await isPortFree(port)
    if (free) return

    if (attempt === 0) {
      // Primer intento fallido — tratar de matar proceso que usa ese puerto
      killPortProcess(port)
      await new Promise(r => setTimeout(r, 1200))
    } else {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error(
    `El puerto ${port} está en uso. Intenta reiniciar la computadora si el problema persiste.`
  )
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

function killPortProcess(port: number): void {
  try {
    if (process.platform === 'win32') {
      // netstat -aon | findstr :PORT → obtener PID
      const raw = execSync(`netstat -aon | findstr :${port}`, { encoding: 'utf8', timeout: 3000 })
      const pids = new Set<string>()
      for (const line of raw.split('\n')) {
        // Buscar entradas LISTENING o ESTABLISHED con el puerto exacto
        if (!line.includes(`:${port} `)) continue
        const match = line.trim().match(/(\d+)\s*$/)
        if (match && match[1] !== '0') pids.add(match[1])
      }
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { timeout: 3000 }) } catch { /* ignore */ }
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { timeout: 3000 })
    }
  } catch { /* ignore — port might already be free */ }
}

async function runLocalMigrations(localRoot: string, scope: 'control-plane' | 'tenant', databaseUrl: string): Promise<void> {
  const dir = path.join(localRoot, 'migrations', scope)
  if (!fs.existsSync(dir)) return

  const files = fs.readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  if (files.length === 0) return

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_pos_local_migrations" (
        "scope" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("scope", "name")
      )
    `)

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM "_pos_local_migrations" WHERE "scope" = $1 AND "name" = $2',
        [scope, file],
      )
      if (applied.rowCount) continue

      if (file.includes('baseline') && await hasExistingSchema(client, scope)) {
        await client.query(
          'INSERT INTO "_pos_local_migrations" ("scope", "name") VALUES ($1, $2)',
          [scope, file],
        )
        console.log(`[local:migrations] marked existing baseline ${scope}/${file}`)
        continue
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO "_pos_local_migrations" ("scope", "name") VALUES ($1, $2)',
          [scope, file],
        )
        await client.query('COMMIT')
        console.log(`[local:migrations] applied ${scope}/${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
  } finally {
    await client.end()
  }
}

async function hasExistingSchema(client: Client, scope: 'control-plane' | 'tenant'): Promise<boolean> {
  const anchorTable = scope === 'control-plane' ? 'Tenant' : 'Company'
  const result = await client.query(
    "SELECT to_regclass($1) AS table_name",
    [`public."${anchorTable}"`],
  )
  return !!result.rows[0]?.table_name
}
