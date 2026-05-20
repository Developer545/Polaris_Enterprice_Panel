/**
 * Seed — productos y servicios ferretería
 * Uso: dotenv -e .env -- npx ts-node --project apps/api/tsconfig.json scripts/seed-ferreteria.ts
 */
import { PrismaClient as TenantPrisma } from '../packages/db/generated/tenant'
import { Decimal } from '@prisma/client/runtime/library'

const tp = new TenantPrisma({
  datasources: { db: { url: process.env.SHARED_TENANT_DATABASE_URL } },
})

const COMPANY_ID = 'company-demo-001'

async function upsertService(data: any) {
  const existing = await tp.service.findFirst({
    where: { companyId: COMPANY_ID, sku: data.sku },
  })
  if (existing) {
    await tp.service.update({
      where: { id: existing.id },
      data: { price: data.price, cost: data.cost, stock: data.stock ?? existing.stock },
    })
    return { ...existing, _op: 'updated' }
  }
  const created = await tp.service.create({ data })
  return { ...created, _op: 'created' }
}

async function main() {
  const company = await tp.company.findUnique({ where: { id: COMPANY_ID } })
  if (!company) throw new Error(`Empresa ${COMPANY_ID} no encontrada. Ejecuta seed.ts primero.`)
  const TID = company.tenantId
  console.log(`\n🏗️  Ferretería seed → ${company.name}\n`)

  // ── Categorías ──────────────────────────────────────────────────────────────
  const catDefs = [
    { name: 'Construcción',       color: '#fa8c16' },
    { name: 'Cerámica y Pisos',   color: '#13c2c2' },
    { name: 'Plomería',           color: '#1677ff' },
    { name: 'Techos y Paredes',   color: '#722ed1' },
    { name: 'Servicios de Inst.', color: '#52c41a' },
  ]

  const cats: Record<string, string> = {}
  for (const c of catDefs) {
    const existing = await tp.category.findFirst({
      where: { companyId: COMPANY_ID, name: c.name },
    })
    const cat = existing
      ?? await tp.category.create({
           data: { tenantId: TID, companyId: COMPANY_ID, name: c.name, color: c.color },
         })
    cats[c.name] = cat.id
    console.log(`  ✓ Cat: ${c.name}`)
  }

  // ── Productos (bienes, tipoItem='1') ────────────────────────────────────────
  const productos = [
    { name: 'Cerámica para Piso 30×30 cm',    sku: 'CER-PI-3030', price: 18.50, cost: 13.00, cat: 'Cerámica y Pisos',   stock: 120, minStock: 20,  uni: 59 },
    { name: 'Cerámica para Pared 25×40 cm',   sku: 'CER-PA-2540', price: 22.00, cost: 16.00, cat: 'Cerámica y Pisos',   stock: 85,  minStock: 15,  uni: 59 },
    { name: 'Cemento Gris 42.5 kg',           sku: 'CEM-GRI-42',  price: 8.75,  cost: 7.00,  cat: 'Construcción',       stock: 300, minStock: 50,  uni: 59 },
    { name: 'Arena Fina (m³)',                 sku: 'ARE-FIN-M3',  price: 25.00, cost: 18.00, cat: 'Construcción',       stock: 40,  minStock: 8,   uni: 59 },
    { name: 'Varilla Corrugada 3/8" × 6 m',  sku: 'VAR-3/8-6M',  price: 4.50,  cost: 3.20,  cat: 'Construcción',       stock: 500, minStock: 100, uni: 59 },
    { name: 'Lámina Zinc Ondulada 0.35 mm',   sku: 'LAM-ZIN-035', price: 12.00, cost: 9.00,  cat: 'Techos y Paredes',   stock: 200, minStock: 30,  uni: 59 },
    { name: 'Tubo PVC 1/2" × 6 m',           sku: 'TUB-PVC-12',  price: 3.25,  cost: 2.40,  cat: 'Plomería',           stock: 350, minStock: 60,  uni: 59 },
    { name: 'Puerta Metálica 0.90 × 2.10 m', sku: 'PUE-MET-90',  price: 185.00,cost: 140.00,cat: 'Techos y Paredes',   stock: 25,  minStock: 5,   uni: 59 },
    { name: 'Pintura Látex Blanca — Galón',   sku: 'PIN-LAT-BLA', price: 16.50, cost: 12.00, cat: 'Construcción',       stock: 150, minStock: 25,  uni: 8  },
    { name: 'Piedrín 3/8" (m³)',             sku: 'PIE-3/8-M3',  price: 35.00, cost: 26.00, cat: 'Construcción',       stock: 30,  minStock: 6,   uni: 59 },
  ]

  console.log('\n📦 Productos (bienes):')
  for (const p of productos) {
    const r = await upsertService({
      tenantId: TID, companyId: COMPANY_ID,
      categoryId: cats[p.cat],
      name: p.name, sku: p.sku,
      price: new Decimal(p.price), cost: new Decimal(p.cost),
      tipoItem: '1', uniMedida: p.uni,
      trackStock: true, stock: p.stock, minStock: p.minStock,
      isActive: true,
    })
    console.log(`  ${(r as any)._op === 'created' ? '✓' : '↺'} ${p.name} — $${p.price.toFixed(2)}`)
  }

  // ── Servicios (tipoItem='2') ────────────────────────────────────────────────
  const servicios = [
    { name: 'Instalación de Cerámica (por m²)',          sku: 'SRV-CER-M2',  price: 8.00  },
    { name: 'Instalación de Puerta con Marco',            sku: 'SRV-PUE-MAR', price: 45.00 },
    { name: 'Instalación de Inodoro / Sanitario',         sku: 'SRV-INO',     price: 35.00 },
    { name: 'Instalación de Lavamanos',                   sku: 'SRV-LAV',     price: 30.00 },
    { name: 'Instalación de Ducha / Regadera',            sku: 'SRV-DUC',     price: 25.00 },
    { name: 'Instalación Tubería PVC (metro lineal)',      sku: 'SRV-TUB-ML',  price: 6.50  },
    { name: 'Instalación de Cielo Falso (por m²)',        sku: 'SRV-CIE-M2',  price: 12.00 },
    { name: 'Pintura Interior Habitación (hasta 20 m²)', sku: 'SRV-PIN-HAB', price: 120.00},
    { name: 'Instalación de Techo Zinc (hasta 20 m²)',   sku: 'SRV-TEC-ZIN', price: 150.00},
    { name: 'Instalación Puerta Madera con Cerradura',    sku: 'SRV-PUE-MAD', price: 55.00 },
  ]

  console.log('\n🔧 Servicios de instalación:')
  for (const s of servicios) {
    const r = await upsertService({
      tenantId: TID, companyId: COMPANY_ID,
      categoryId: cats['Servicios de Inst.'],
      name: s.name, sku: s.sku,
      price: new Decimal(s.price), cost: new Decimal(0),
      tipoItem: '2', uniMedida: 74,
      trackStock: false, stock: 0, minStock: 0,
      isActive: true,
    })
    console.log(`  ${(r as any)._op === 'created' ? '✓' : '↺'} ${s.name} — $${s.price.toFixed(2)}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Seed completado — ${productos.length} productos + ${servicios.length} servicios`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch(e => { console.error('❌ Error:', e.message ?? e); process.exit(1) })
  .finally(() => tp.$disconnect())
