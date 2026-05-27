UPDATE "Tenant"
SET "modules" = COALESCE("modules", '{}'::jsonb) || '{
  "dashboard": true,
  "pos": true,
  "ventas": true,
  "dte": true,
  "turnos_caja": true,
  "clientes": true,
  "proveedores": true,
  "inventario": true,
  "productos": true,
  "servicios": true
}'::jsonb;
