# Migración a Prisma Migrate — Baseline

## ¿Por qué?

`prisma db push` no genera historial de migraciones — no hay rollback, no hay auditoría,
no hay reproducibilidad garantizada entre entornos. `prisma migrate` resuelve todo esto.

## Pasos únicos para migrar base de datos existente

Ejecutar **una sola vez** en cada entorno (local, staging, prod) donde la DB ya tiene datos.

### 1. Control Plane (CONTROL_PLANE_DATABASE_URL)

```bash
cd packages/db

# Genera el SQL baseline desde el schema actual
npx dotenv -e ../../.env -- prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/control-plane.prisma \
  --script \
  > migrations/control-plane/0_baseline.sql

# Marca la baseline como ya aplicada (sin re-ejecutarla)
npx dotenv -e ../../.env -- prisma migrate resolve \
  --applied "0_baseline" \
  --schema prisma/control-plane.prisma
```

### 2. Tenant Shared DB (SHARED_TENANT_DATABASE_URL)

```bash
cd packages/db

npx dotenv -e ../../.env -- prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/tenant.prisma \
  --script \
  > migrations/tenant/0_baseline.sql

npx dotenv -e ../../.env -- prisma migrate resolve \
  --applied "0_baseline" \
  --schema prisma/tenant.prisma
```

## Flujo diario de desarrollo

```bash
# Crear nueva migración tras editar un .prisma
npm run migrate:dev:cp     # para control-plane.prisma
npm run migrate:dev:tenant # para tenant.prisma

# Ver estado de migraciones pendientes
npm run migrate:status:cp
npm run migrate:status:tenant
```

## Flujo en producción / CI

```bash
# Aplicar migraciones pendientes (no interactivo)
npm run migrate:deploy:cp
npm run migrate:deploy:tenant
```

## Notas multi-tenant

- `SHARED_TENANT_DATABASE_URL` es la DB compartida — una sola migración la cubre.
- Tenants con estrategia `NEON_DEDICATED` necesitan que sus URLs individuales reciban
  `migrate:deploy:tenant` apuntando a cada URL. Automatizar con script en `tenants.service.ts`
  usando `prisma.$executeRawUnsafe` o una conexión dinámica + `migrate deploy`.
