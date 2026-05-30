/**
 * seed-owner.mjs
 * Crea rol "Dueño" (branches.view_all=true) + usuario owner.
 *
 * Uso desde raíz del proyecto:
 *   node scripts/seed-owner.mjs
 *   node scripts/seed-owner.mjs --email="dueno@empresa.com" --password="MiClave123!"
 *   node scripts/seed-owner.mjs --company="clxxxxxx"   (id de empresa específica)
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require    = createRequire(import.meta.url)

// ── Cargar .env raíz ──────────────────────────────────────────────────────────
try {
  const lines = readFileSync(resolve(__dirname, '../.env'), 'utf8').split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v   = t.slice(i + 1).trim()
    if (/^["'].*["']$/.test(v)) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
} catch { /* usa env existente */ }

// ── Dependencias ──────────────────────────────────────────────────────────────
const bcrypt     = require(resolve(__dirname, '../node_modules/bcryptjs'))
const { PrismaClient } = require(resolve(__dirname, '../packages/db/generated/tenant'))

// ── Args ──────────────────────────────────────────────────────────────────────
const arg = (name, fallback) => {
  const f = process.argv.find(a => a.startsWith(`--${name}=`))
  return f ? f.split('=').slice(1).join('=') : fallback
}
const OWNER_EMAIL    = arg('email',    'owner@polaris.com')
const OWNER_PASSWORD = arg('password', 'Owner123!')
const TARGET_COMPANY = arg('company',  null)

// ── Permisos completos ────────────────────────────────────────────────────────
const ALL_PERMISSIONS = {
  'pos.create': true, 'pos.view': true, 'pos.cancel': true,
  'sales.view': true,
  'dte.view': true, 'dte.emit': true, 'dte.anular': true,
  'clients.view': true, 'clients.create': true, 'clients.edit': true, 'clients.delete': true,
  'products.view': true, 'products.create': true, 'products.edit': true, 'products.delete': true,
  'categories.view': true,
  'users.view': true, 'users.create': true, 'users.edit': true, 'users.delete': true,
  'roles.view': true, 'roles.create': true, 'roles.edit': true, 'roles.delete': true,
  'company.view': true, 'company.edit': true,
  'branches.view': true, 'branches.create': true, 'branches.edit': true, 'branches.delete': true,
  'branches.view_all': true,        // ← Panel Central consolidado
  'cash_register.view': true, 'cash_register.open': true, 'cash_register.close': true,
  'reports.view': true,
  'settings.view': true, 'settings.edit': true,
  'suppliers.view': true, 'suppliers.create': true, 'suppliers.edit': true, 'suppliers.delete': true,
  'purchases.view': true, 'purchases.create': true, 'purchases.edit': true,
  'accounts_payable.view': true, 'accounts_payable.create': true, 'accounts_payable.edit': true,
  'expenses.view': true, 'expenses.create': true, 'expenses.edit': true, 'expenses.delete': true,
  'employees.view': true, 'employees.create': true, 'employees.edit': true, 'employees.delete': true,
  'payroll.view': true, 'payroll.create': true, 'payroll.approve': true,
  'inventory.view': true, 'inventory.create': true, 'inventory.adjust': true,
  'accounts_receivable.view': true, 'accounts_receivable.create': true, 'accounts_receivable.edit': true,
}

// ── Main ──────────────────────────────────────────────────────────────────────
const dbUrl = process.env.SHARED_TENANT_DATABASE_URL
if (!dbUrl) { console.error('ERROR: SHARED_TENANT_DATABASE_URL no definido'); process.exit(1) }

const db = new PrismaClient({ datasources: { db: { url: dbUrl } } })

async function main() {
  // 1. Empresa
  const company = TARGET_COMPANY
    ? await db.company.findUnique({ where: { id: TARGET_COMPANY } })
    : await db.company.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!company) {
    console.error('\nERROR: No hay ninguna empresa en la BD.')
    console.error('Crea primero un Tenant + Company desde el admin panel.\n')
    process.exit(1)
  }
  console.log(`\n✓ Empresa: "${company.name}"  (id: ${company.id})`)

  // 2. Verificar duplicado
  const existing = await db.user.findUnique({
    where: { email_companyId: { email: OWNER_EMAIL, companyId: company.id } },
  })
  if (existing) {
    console.log(`\n⚠ El usuario "${OWNER_EMAIL}" ya existe en esta empresa.`)
    console.log('  Usa --email=otro@email.com para crear uno distinto.\n')
    return
  }

  // 3. Rol "Dueño" (crea o actualiza permisos)
  let role = await db.role.findFirst({ where: { companyId: company.id, name: 'Dueño' } })
  if (!role) {
    role = await db.role.create({
      data: {
        tenantId: company.tenantId, companyId: company.id,
        name: 'Dueño', description: 'Propietario — acceso total + panel central',
        permissions: ALL_PERMISSIONS, isSystem: true,
      },
    })
    console.log(`✓ Rol "Dueño" creado  (id: ${role.id})`)
  } else {
    role = await db.role.update({ where: { id: role.id }, data: { permissions: ALL_PERMISSIONS } })
    console.log(`✓ Rol "Dueño" existe — permisos actualizados  (id: ${role.id})`)
  }

  // 4. Hash + usuario
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12)
  const user = await db.user.create({
    data: {
      tenantId: company.tenantId, companyId: company.id,
      roleId: role.id,
      name: 'Dueño / Propietario',
      email: OWNER_EMAIL,
      password: passwordHash,
      isActive: true,
      // Sin UserBranch → branchIds=[] pero canViewAllBranches=true por el rol
    },
  })

  console.log('\n✅  Usuario owner creado:')
  console.log(`   Email:      ${user.email}`)
  console.log(`   Contraseña: ${OWNER_PASSWORD}`)
  console.log(`   Rol:        Dueño  (branches.view_all = true)`)
  console.log(`   ID:         ${user.id}`)
  console.log('\n🌐  Inicia sesión → verás "Panel central" en el menú lateral.\n')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
