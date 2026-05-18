/**
 * Seed script — creates initial control-plane + tenant data for local dev
 *
 * Run: CONTROL_PLANE_DATABASE_URL=... SHARED_TENANT_DATABASE_URL=... npx ts-node --project apps/api/tsconfig.json scripts/seed.ts
 *
 * Creates:
 *  - Control plane: 1 plan, 1 tenant, 1 admin user
 *  - Tenant DB: 1 company, 1 branch, 1 admin role, 1 user
 *
 * Login credentials (web app):
 *   Company ID: (printed at the end)
 *   Email:      admin@demo.com
 *   Password:   Admin123!
 */
import 'reflect-metadata'
import { PrismaClient as ControlPrisma } from '../packages/db/generated/control-plane'
import { PrismaClient as TenantPrisma } from '../packages/db/generated/tenant'
import * as bcrypt from 'bcryptjs'

const cp = new ControlPrisma({ datasources: { db: { url: process.env.CONTROL_PLANE_DATABASE_URL } } })
const tp = new TenantPrisma({ datasources: { db: { url: process.env.SHARED_TENANT_DATABASE_URL } } })

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Control Plane ────────────────────────────────────────────────────────

  // Plan
  const plan = await cp.plan.upsert({
    where: { name: 'Pro' },
    update: {},
    create: {
      name: 'Pro',
      description: 'Plan completo para desarrollo local',
      price: 0,
      maxBranches: 5,
      maxUsers: 20,
      features: { dte: true, payroll: true, reports: true },
    },
  })
  console.log(`✓ Plan: ${plan.name}`)

  // Tenant
  const tenant = await cp.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Company SV',
      email: 'info@demo.com.sv',
      planId: plan.id,
      status: 'ACTIVE',
      dbStrategy: 'NEON_SHARED',
    },
  })
  console.log(`✓ Tenant: ${tenant.slug} (${tenant.id})`)

  // Admin user (control plane)
  const adminPwd = await bcrypt.hash('SuperAdmin123!', 12)
  const adminUser = await cp.adminUser.upsert({
    where: { email: 'superadmin@pos-dte.sv' },
    update: {},
    create: {
      email: 'superadmin@pos-dte.sv',
      password: adminPwd,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  })
  console.log(`✓ AdminUser: ${adminUser.email}`)

  // ─── Tenant DB ────────────────────────────────────────────────────────────

  // Company
  const company = await tp.company.upsert({
    where: { id: 'company-demo-001' },
    update: {},
    create: {
      id: 'company-demo-001',
      tenantId: tenant.id,
      name: 'Demo Company El Salvador, S.A. de C.V.',
      comercialName: 'Demo Company',
      nit: '0614-010101-001-1',
      nrc: '123456-7',
      actividadEconomica: 'Comercio al por mayor y al por menor',
      actividadEconomicaCodigo: '4711',
      address: 'Calle Principal #123, San Salvador',
      phone: '2222-3333',
      email: 'info@demo.com.sv',
      dteAmbiente: 'TEST',
    },
  })
  console.log(`✓ Company: ${company.comercialName} (${company.id})`)

  // Branch
  const branch = await tp.branch.upsert({
    where: { id: 'branch-demo-001' },
    update: {},
    create: {
      id: 'branch-demo-001',
      tenantId: tenant.id,
      companyId: company.id,
      name: 'Sucursal Central',
      address: 'Calle Principal #123, San Salvador',
      codEstableMH: 'M001',
      codPuntoVentaMH: 'P001',
      isActive: true,
    },
  })
  console.log(`✓ Branch: ${branch.name}`)

  // Role
  const allPermissions: Record<string, boolean> = {
    'pos.create': true,
    'pos.view': true,
    'pos.cancel': true,
    'sales.view': true,
    'dte.view': true,
    'dte.emit': true,
    'dte.anular': true,
    'clients.view': true,
    'clients.create': true,
    'clients.edit': true,
    'clients.delete': true,
    'products.view': true,
    'products.create': true,
    'products.edit': true,
    'products.delete': true,
    'categories.view': true,
    'users.view': true,
    'users.create': true,
    'users.edit': true,
    'users.delete': true,
    'roles.view': true,
    'roles.create': true,
    'roles.edit': true,
    'roles.delete': true,
    'company.view': true,
    'company.edit': true,
    'branches.view': true,
    'branches.create': true,
    'branches.edit': true,
    'branches.delete': true,
    'cash_register.view': true,
    'cash_register.open': true,
    'cash_register.close': true,
    'reports.view': true,
    'settings.view': true,
    'settings.edit': true,
    'suppliers.view': true,
    'suppliers.create': true,
    'suppliers.edit': true,
    'suppliers.delete': true,
    'purchases.view': true,
    'purchases.create': true,
    'purchases.edit': true,
    'accounts_payable.view': true,
    'accounts_payable.create': true,
    'accounts_payable.edit': true,
    'expenses.view': true,
    'expenses.create': true,
    'expenses.edit': true,
    'expenses.delete': true,
    'employees.view': true,
    'employees.create': true,
    'employees.edit': true,
    'employees.delete': true,
    'payroll.view': true,
    'payroll.create': true,
    'payroll.approve': true,
  }

  const adminRole = await tp.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Administrador' } },
    update: { permissions: allPermissions },
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      name: 'Administrador',
      description: 'Acceso total al sistema',
      permissions: allPermissions,
    },
  })
  console.log(`✓ Role: ${adminRole.name}`)

  // User
  const userPwd = await bcrypt.hash('Admin123!', 12)
  const user = await tp.user.upsert({
    where: { email_companyId: { email: 'admin@demo.com', companyId: company.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      roleId: adminRole.id,
      name: 'Admin Demo',
      email: 'admin@demo.com',
      password: userPwd,
      isActive: true,
      branches: {
        create: [{ branchId: branch.id }],
      },
    },
  })
  console.log(`✓ User: ${user.email}`)

  // ─── Catálogos Globales (Departamentos + Municipios + Actividades) ────────

  const departamentos = [
    { codigo: '01', nombre: 'Ahuachapán' },
    { codigo: '02', nombre: 'Santa Ana' },
    { codigo: '03', nombre: 'Sonsonate' },
    { codigo: '04', nombre: 'Chalatenango' },
    { codigo: '05', nombre: 'La Libertad' },
    { codigo: '06', nombre: 'San Salvador' },
    { codigo: '07', nombre: 'Cuscatlán' },
    { codigo: '08', nombre: 'La Paz' },
    { codigo: '09', nombre: 'Cabañas' },
    { codigo: '10', nombre: 'San Vicente' },
    { codigo: '11', nombre: 'Usulután' },
    { codigo: '12', nombre: 'San Miguel' },
    { codigo: '13', nombre: 'Morazán' },
    { codigo: '14', nombre: 'La Unión' },
  ]

  const municipiosPorDepto: Record<string, { codigo: string; nombre: string }[]> = {
    '01': [
      { codigo: '01', nombre: 'Ahuachapán' }, { codigo: '02', nombre: 'Apaneca' },
      { codigo: '03', nombre: 'Atiquizaya' }, { codigo: '04', nombre: 'Concepción de Ataco' },
      { codigo: '05', nombre: 'El Refugio' }, { codigo: '06', nombre: 'Guaymango' },
      { codigo: '07', nombre: 'Jujutla' }, { codigo: '08', nombre: 'San Francisco Menéndez' },
      { codigo: '09', nombre: 'San Lorenzo' }, { codigo: '10', nombre: 'San Pedro Puxtla' },
      { codigo: '11', nombre: 'Tacuba' }, { codigo: '12', nombre: 'Turín' },
    ],
    '02': [
      { codigo: '01', nombre: 'Santa Ana' }, { codigo: '02', nombre: 'Candelaria de la Frontera' },
      { codigo: '03', nombre: 'Chalchuapa' }, { codigo: '04', nombre: 'Coatepeque' },
      { codigo: '05', nombre: 'El Congo' }, { codigo: '06', nombre: 'El Porvenir' },
      { codigo: '07', nombre: 'Masahuat' }, { codigo: '08', nombre: 'Metapán' },
      { codigo: '09', nombre: 'San Antonio Pajonal' }, { codigo: '10', nombre: 'San Sebastián Salitrillo' },
      { codigo: '11', nombre: 'Santa Rosa Guachipilín' }, { codigo: '12', nombre: 'Santiago de la Frontera' },
      { codigo: '13', nombre: 'Texistepeque' },
    ],
    '03': [
      { codigo: '01', nombre: 'Sonsonate' }, { codigo: '02', nombre: 'Acajutla' },
      { codigo: '03', nombre: 'Armenia' }, { codigo: '04', nombre: 'Caluco' },
      { codigo: '05', nombre: 'Cuisnahuat' }, { codigo: '06', nombre: 'Izalco' },
      { codigo: '07', nombre: 'Juayúa' }, { codigo: '08', nombre: 'Nahuizalco' },
      { codigo: '09', nombre: 'Nahulingo' }, { codigo: '10', nombre: 'Salcoatitán' },
      { codigo: '11', nombre: 'San Antonio del Monte' }, { codigo: '12', nombre: 'San Julián' },
      { codigo: '13', nombre: 'Santa Catarina Masahuat' }, { codigo: '14', nombre: 'Santa Isabel Ishuatán' },
      { codigo: '15', nombre: 'Santo Domingo de Guzmán' }, { codigo: '16', nombre: 'Sonzacate' },
    ],
    '04': [
      { codigo: '01', nombre: 'Chalatenango' }, { codigo: '02', nombre: 'Agua Caliente' },
      { codigo: '03', nombre: 'Arcatao' }, { codigo: '04', nombre: 'Azacualpa' },
      { codigo: '05', nombre: 'Cancasque' }, { codigo: '06', nombre: 'Citalá' },
      { codigo: '07', nombre: 'Comalapa' }, { codigo: '08', nombre: 'Concepción Quezaltepeque' },
      { codigo: '09', nombre: 'Dulce Nombre de María' }, { codigo: '10', nombre: 'El Carrizal' },
      { codigo: '11', nombre: 'El Paraíso' }, { codigo: '12', nombre: 'La Laguna' },
      { codigo: '13', nombre: 'La Palma' }, { codigo: '14', nombre: 'La Reina' },
      { codigo: '15', nombre: 'Las Vueltas' }, { codigo: '16', nombre: 'Nombre de Jesús' },
      { codigo: '17', nombre: 'Nueva Concepción' }, { codigo: '18', nombre: 'Nueva Trinidad' },
      { codigo: '19', nombre: 'Ojos de Agua' }, { codigo: '20', nombre: 'Potonico' },
      { codigo: '21', nombre: 'San Antonio de la Cruz' }, { codigo: '22', nombre: 'San Antonio Los Ranchos' },
      { codigo: '23', nombre: 'San Fernando' }, { codigo: '24', nombre: 'San Francisco Lempa' },
      { codigo: '25', nombre: 'San Francisco Morazán' }, { codigo: '26', nombre: 'San Ignacio' },
      { codigo: '27', nombre: 'San Isidro Labrador' }, { codigo: '28', nombre: 'San Luis del Carmen' },
      { codigo: '29', nombre: 'San Miguel de Mercedes' }, { codigo: '30', nombre: 'San Rafael' },
      { codigo: '31', nombre: 'Santa Rita' }, { codigo: '32', nombre: 'Tejutla' },
    ],
    '05': [
      { codigo: '01', nombre: 'Santa Tecla (Nueva San Salvador)' }, { codigo: '02', nombre: 'Antiguo Cuscatlán' },
      { codigo: '03', nombre: 'Chiltiupán' }, { codigo: '04', nombre: 'Ciudad Arce' },
      { codigo: '05', nombre: 'Colon' }, { codigo: '06', nombre: 'Comacarán' },
      { codigo: '07', nombre: 'Huizúcar' }, { codigo: '08', nombre: 'Jayaque' },
      { codigo: '09', nombre: 'Jicalapa' }, { codigo: '10', nombre: 'La Libertad' },
      { codigo: '11', nombre: 'Nuevo Cuscatlán' }, { codigo: '12', nombre: 'Opico' },
      { codigo: '13', nombre: 'Quezaltepeque' }, { codigo: '14', nombre: 'Sacacoyo' },
      { codigo: '15', nombre: 'San José Villanueva' }, { codigo: '16', nombre: 'San Juan Opico' },
      { codigo: '17', nombre: 'San Matías' }, { codigo: '18', nombre: 'San Pablo Tacachico' },
      { codigo: '19', nombre: 'Talnique' }, { codigo: '20', nombre: 'Tamanique' },
      { codigo: '21', nombre: 'Teotepeque' }, { codigo: '22', nombre: 'Tepecoyo' },
      { codigo: '23', nombre: 'Zaragoza' },
    ],
    '06': [
      { codigo: '01', nombre: 'San Salvador' }, { codigo: '02', nombre: 'Aguilares' },
      { codigo: '03', nombre: 'Apopa' }, { codigo: '04', nombre: 'Ayutuxtepeque' },
      { codigo: '05', nombre: 'Cuscatancingo' }, { codigo: '06', nombre: 'Delgado' },
      { codigo: '07', nombre: 'El Paisnal' }, { codigo: '08', nombre: 'Guazapa' },
      { codigo: '09', nombre: 'Ilopango' }, { codigo: '10', nombre: 'Mejicanos' },
      { codigo: '11', nombre: 'Nejapa' }, { codigo: '12', nombre: 'Panchimalco' },
      { codigo: '13', nombre: 'Rosario de Mora' }, { codigo: '14', nombre: 'San Marcos' },
      { codigo: '15', nombre: 'San Martín' }, { codigo: '16', nombre: 'Santiago Texacuangos' },
      { codigo: '17', nombre: 'Santo Tomás' }, { codigo: '18', nombre: 'Soyapango' },
      { codigo: '19', nombre: 'Tonacatepeque' },
    ],
    '07': [
      { codigo: '01', nombre: 'Cojutepeque' }, { codigo: '02', nombre: 'El Carmen' },
      { codigo: '03', nombre: 'El Rosario' }, { codigo: '04', nombre: 'Monte San Juan' },
      { codigo: '05', nombre: 'Oratorio de Concepción' }, { codigo: '06', nombre: 'San Bartolomé Perulapía' },
      { codigo: '07', nombre: 'San Cristóbal' }, { codigo: '08', nombre: 'San José Guayabal' },
      { codigo: '09', nombre: 'San Pedro Perulapán' }, { codigo: '10', nombre: 'San Ramón' },
      { codigo: '11', nombre: 'Santa Cruz Analquito' }, { codigo: '12', nombre: 'Santa Cruz Michapa' },
      { codigo: '13', nombre: 'Suchitoto' }, { codigo: '14', nombre: 'San Juan Tepezontes' },
    ],
    '08': [
      { codigo: '01', nombre: 'Zacatecoluca' }, { codigo: '02', nombre: 'Cuyultitán' },
      { codigo: '03', nombre: 'El Rosario' }, { codigo: '04', nombre: 'Jerusalén' },
      { codigo: '05', nombre: 'Mercedes La Ceiba' }, { codigo: '06', nombre: 'Olocuilta' },
      { codigo: '07', nombre: 'Paraíso de Osorio' }, { codigo: '08', nombre: 'San Antonio Masahuat' },
      { codigo: '09', nombre: 'San Emigdio' }, { codigo: '10', nombre: 'San Francisco Chinameca' },
      { codigo: '11', nombre: 'San Juan Nonualco' }, { codigo: '12', nombre: 'San Juan Talpa' },
      { codigo: '13', nombre: 'San Juan Tepezontes' }, { codigo: '14', nombre: 'San Luis La Herradura' },
      { codigo: '15', nombre: 'San Luis Talpa' }, { codigo: '16', nombre: 'San Miguel Tepezontes' },
      { codigo: '17', nombre: 'San Pedro Masahuat' }, { codigo: '18', nombre: 'San Pedro Nonualco' },
      { codigo: '19', nombre: 'San Rafael Obrajuelo' }, { codigo: '20', nombre: 'Santa María Ostuma' },
      { codigo: '21', nombre: 'Santiago Nonualco' }, { codigo: '22', nombre: 'Tapalhuaca' },
    ],
    '09': [
      { codigo: '01', nombre: 'Sensuntepeque' }, { codigo: '02', nombre: 'Cinquera' },
      { codigo: '03', nombre: 'Dolores' }, { codigo: '04', nombre: 'Guacotecti' },
      { codigo: '05', nombre: 'Ilobasco' }, { codigo: '06', nombre: 'Jutiapa' },
      { codigo: '07', nombre: 'San Isidro' }, { codigo: '08', nombre: 'Tejutepeque' },
      { codigo: '09', nombre: 'Victoria' },
    ],
    '10': [
      { codigo: '01', nombre: 'San Vicente' }, { codigo: '02', nombre: 'Apastepeque' },
      { codigo: '03', nombre: 'Guadalupe' }, { codigo: '04', nombre: 'San Cayetano Istepeque' },
      { codigo: '05', nombre: 'San Esteban Catarina' }, { codigo: '06', nombre: 'San Ildefonso' },
      { codigo: '07', nombre: 'San Lorenzo' }, { codigo: '08', nombre: 'San Sebastián' },
      { codigo: '09', nombre: 'Santa Clara' }, { codigo: '10', nombre: 'Santo Domingo' },
      { codigo: '11', nombre: 'Tecoluca' }, { codigo: '12', nombre: 'Tepetitán' },
      { codigo: '13', nombre: 'Verapaz' },
    ],
    '11': [
      { codigo: '01', nombre: 'Usulután' }, { codigo: '02', nombre: 'Alegría' },
      { codigo: '03', nombre: 'Berlín' }, { codigo: '04', nombre: 'California' },
      { codigo: '05', nombre: 'Concepción Batres' }, { codigo: '06', nombre: 'El Triunfo' },
      { codigo: '07', nombre: 'Ereguayquín' }, { codigo: '08', nombre: 'Estanzuelas' },
      { codigo: '09', nombre: 'General Pedro Ávila' }, { codigo: '10', nombre: 'Jiquilisco' },
      { codigo: '11', nombre: 'Jucuapa' }, { codigo: '12', nombre: 'Jucuarán' },
      { codigo: '13', nombre: 'Mercedes Umaña' }, { codigo: '14', nombre: 'Nueva Granada' },
      { codigo: '15', nombre: 'Ozatlán' }, { codigo: '16', nombre: 'Puerto El Triunfo' },
      { codigo: '17', nombre: 'San Agustín' }, { codigo: '18', nombre: 'San Buenaventura' },
      { codigo: '19', nombre: 'San Dionisio' }, { codigo: '20', nombre: 'San Francisco Javier' },
      { codigo: '21', nombre: 'Santa Elena' }, { codigo: '22', nombre: 'Santa María' },
      { codigo: '23', nombre: 'Santiago de María' }, { codigo: '24', nombre: 'Tecapán' },
    ],
    '12': [
      { codigo: '01', nombre: 'San Miguel' }, { codigo: '02', nombre: 'Carolina' },
      { codigo: '03', nombre: 'Chapeltique' }, { codigo: '04', nombre: 'Chinameca' },
      { codigo: '05', nombre: 'Chirilagua' }, { codigo: '06', nombre: 'Ciudad Barrios' },
      { codigo: '07', nombre: 'Comacarán' }, { codigo: '08', nombre: 'El Tránsito' },
      { codigo: '09', nombre: 'Lolotique' }, { codigo: '10', nombre: 'Moncagua' },
      { codigo: '11', nombre: 'Nueva Guadalupe' }, { codigo: '12', nombre: 'Nuevo Edén de San Juan' },
      { codigo: '13', nombre: 'Quelepa' }, { codigo: '14', nombre: 'San Antonio' },
      { codigo: '15', nombre: 'San Gerardo' }, { codigo: '16', nombre: 'San Jorge' },
      { codigo: '17', nombre: 'San Luis de la Reina' }, { codigo: '18', nombre: 'San Rafael Oriente' },
      { codigo: '19', nombre: 'Sesori' }, { codigo: '20', nombre: 'Uluazapa' },
    ],
    '13': [
      { codigo: '01', nombre: 'San Francisco Gotera' }, { codigo: '02', nombre: 'Arambala' },
      { codigo: '03', nombre: 'Cacaopera' }, { codigo: '04', nombre: 'Corinto' },
      { codigo: '05', nombre: 'Chilanga' }, { codigo: '06', nombre: 'Delicias de Concepción' },
      { codigo: '07', nombre: 'El Divisadero' }, { codigo: '08', nombre: 'El Rosario' },
      { codigo: '09', nombre: 'Gualococti' }, { codigo: '10', nombre: 'Guatajiagua' },
      { codigo: '11', nombre: 'Joateca' }, { codigo: '12', nombre: 'Jocoaitique' },
      { codigo: '13', nombre: 'Jocoro' }, { codigo: '14', nombre: 'Lolotiquillo' },
      { codigo: '15', nombre: 'Meanguera' }, { codigo: '16', nombre: 'Osicala' },
      { codigo: '17', nombre: 'Perquín' }, { codigo: '18', nombre: 'San Carlos' },
      { codigo: '19', nombre: 'San Fernando' }, { codigo: '20', nombre: 'San Isidro' },
      { codigo: '21', nombre: 'San Simón' }, { codigo: '22', nombre: 'Sensembra' },
      { codigo: '23', nombre: 'Sociedad' }, { codigo: '24', nombre: 'Torola' },
      { codigo: '25', nombre: 'Yamabal' }, { codigo: '26', nombre: 'Yoloaiquín' },
    ],
    '14': [
      { codigo: '01', nombre: 'La Unión' }, { codigo: '02', nombre: 'Anamorós' },
      { codigo: '03', nombre: 'Bolívar' }, { codigo: '04', nombre: 'Concepción de Oriente' },
      { codigo: '05', nombre: 'Conchagua' }, { codigo: '06', nombre: 'El Carmen' },
      { codigo: '07', nombre: 'El Sauce' }, { codigo: '08', nombre: 'Intipucá' },
      { codigo: '09', nombre: 'Lislique' }, { codigo: '10', nombre: 'Meanguera del Golfo' },
      { codigo: '11', nombre: 'Nueva Esparta' }, { codigo: '12', nombre: 'Pasaquina' },
      { codigo: '13', nombre: 'Polorós' }, { codigo: '14', nombre: 'San Alejo' },
      { codigo: '15', nombre: 'San José' }, { codigo: '16', nombre: 'Santa Rosa de Lima' },
      { codigo: '17', nombre: 'Yayantique' }, { codigo: '18', nombre: 'Yucuaiquín' },
    ],
  }

  const actividades = [
    { codigo: '4711', nombre: 'Venta al por menor en comercios no especializados' },
    { codigo: '4719', nombre: 'Otras actividades de venta al por menor' },
    { codigo: '4721', nombre: 'Venta al por menor de alimentos' },
    { codigo: '4722', nombre: 'Venta al por menor de bebidas en comercios especializados' },
    { codigo: '4731', nombre: 'Venta al por menor de combustibles' },
    { codigo: '4741', nombre: 'Venta al por menor de computadoras y equipo periférico' },
    { codigo: '4751', nombre: 'Venta al por menor de textiles' },
    { codigo: '4752', nombre: 'Venta al por menor de artículos de ferretería' },
    { codigo: '4761', nombre: 'Venta al por menor de libros, periódicos y artículos de papelería' },
    { codigo: '4771', nombre: 'Venta al por menor de prendas de vestir' },
    { codigo: '4772', nombre: 'Venta al por menor de productos farmacéuticos' },
    { codigo: '4781', nombre: 'Venta al por menor de alimentos en puestos de venta' },
    { codigo: '4789', nombre: 'Venta al por menor en otros puestos de venta' },
    { codigo: '5610', nombre: 'Actividades de restaurantes y de servicio móvil de comidas' },
    { codigo: '5630', nombre: 'Servicio de bebidas' },
    { codigo: '6201', nombre: 'Actividades de programación informática' },
    { codigo: '6202', nombre: 'Actividades de consultoría informática' },
    { codigo: '6209', nombre: 'Otras actividades de tecnología de la información' },
    { codigo: '6311', nombre: 'Procesamiento de datos y hospedaje' },
    { codigo: '6920', nombre: 'Actividades de contabilidad, teneduría de libros y auditoría' },
    { codigo: '7010', nombre: 'Actividades de administración empresarial' },
    { codigo: '7020', nombre: 'Actividades de consultoría de gestión empresarial' },
    { codigo: '7490', nombre: 'Otras actividades profesionales, científicas y técnicas' },
    { codigo: '7500', nombre: 'Actividades veterinarias' },
    { codigo: '8610', nombre: 'Actividades de hospitales' },
    { codigo: '8621', nombre: 'Actividades de medicina general' },
    { codigo: '8622', nombre: 'Actividades de medicina especializada' },
    { codigo: '8623', nombre: 'Actividades de odontología' },
    { codigo: '8690', nombre: 'Otras actividades de atención de la salud humana' },
    { codigo: '9311', nombre: 'Gestión de instalaciones deportivas' },
    { codigo: '9321', nombre: 'Actividades de parques de atracciones y parques temáticos' },
    { codigo: '9411', nombre: 'Actividades de asociaciones empresariales y patronales' },
    { codigo: '9521', nombre: 'Reparación de computadoras y equipo periférico' },
    { codigo: '9529', nombre: 'Reparación de otros enseres domésticos' },
    { codigo: '9602', nombre: 'Peluquería y otros tratamientos de belleza' },
    { codigo: '9609', nombre: 'Otras actividades de servicios personales' },
  ]

  // Seed departamentos
  for (const dept of departamentos) {
    await tp.departamento.upsert({
      where: { codigo: dept.codigo },
      update: { nombre: dept.nombre },
      create: dept,
    })
  }
  console.log(`✓ Departamentos: ${departamentos.length} registros`)

  // Seed municipios
  let totalMunicipios = 0
  for (const [deptCod, munis] of Object.entries(municipiosPorDepto)) {
    for (const muni of munis) {
      await tp.municipio.upsert({
        where: { departamentoCod_codigo: { departamentoCod: deptCod, codigo: muni.codigo } },
        update: { nombre: muni.nombre },
        create: { ...muni, departamentoCod: deptCod },
      })
      totalMunicipios++
    }
  }
  console.log(`✓ Municipios: ${totalMunicipios} registros`)

  // Seed actividades económicas
  for (const act of actividades) {
    await tp.actividadEconomica.upsert({
      where: { codigo: act.codigo },
      update: { nombre: act.nombre },
      create: act,
    })
  }
  console.log(`✓ Actividades económicas: ${actividades.length} registros`)

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Seed completado!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 CREDENCIALES DE ACCESO (web):')
  console.log(`   Company ID : ${company.id}`)
  console.log('   Email      : admin@demo.com')
  console.log('   Password   : Admin123!')
  console.log('\n📋 CREDENCIALES ADMIN (panel control):')
  console.log('   Email    : superadmin@pos-dte.sv')
  console.log('   Password : SuperAdmin123!')
  console.log('\n📌 URL web: http://localhost:3010')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => {
    await cp.$disconnect()
    await tp.$disconnect()
  })
