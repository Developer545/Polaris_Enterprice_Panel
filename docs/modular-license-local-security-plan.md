# Polaris Local: licencias, modulos y backups

## Objetivo

Mantener la version local segura y barata de operar:

- La PC local no consulta el panel por cada venta, DTE o pantalla.
- El panel firma derechos de uso y la app local los usa offline.
- Los modulos se activan desde el panel y se reciben en el siguiente sync.
- Los backups corren en la computadora del cliente, no en el panel.

## Paquete base

Toda licencia nueva incluye:

- dashboard
- pos
- ventas
- dte
- turnos_caja
- clientes
- proveedores
- inventario
- productos
- servicios

Los modulos addon quedan apagados hasta que el cliente los compra. El catalogo central vive en
`packages/shared-types/src/module-registry.ts`; para crear un modulo nuevo se agrega ahi y luego se
protegen sus rutas con `@RequireModule` y `@RequireLocalModule`.

## Flujo de licencia local

1. El wizard pide la licencia.
2. Electron calcula HWID con motherboard, CPU y fallbacks.
3. Electron llama `POST /licenses/validate`.
4. El panel vincula el HWID, genera `licenseRevision` y firma los permisos con ECDSA.
5. Electron guarda la licencia cifrada con AES-256-GCM derivado del HWID.
6. El backend local lee `local-permissions.json`, verifica firma y bloquea modulos no comprados.

## Sync de bajo costo

La app local usa `POST /licenses/sync` solo en estos momentos:

- Primer arranque despues de activar.
- Si el cache local ya tiene 1 dia o mas.
- Heartbeat nocturno.
- Reporte de resultado de comandos remotos.

El panel nunca participa en cada DTE. PDF, JSON, firma, envio a Hacienda y almacenamiento local no
consumen recursos del panel.

## Backups

El cliente puede crear backup desde Configuracion > Respaldos.

El panel puede solicitar backup desde Licencias. Esa accion no abre puertos hacia el cliente:

1. El panel guarda un `LicenseCommand` pendiente.
2. La app local lo recibe en `/licenses/sync`.
3. Electron llama al backend local con token efimero.
4. El backend local ejecuta `pg_dump` de control-plane y tenant.
5. Se escribe un `manifest.json` con SHA-256.
6. La app reporta `SUCCEEDED` o `FAILED` al panel.

## Cambios de Hacienda

Clientes online:

- Se actualiza el backend online y el cambio aplica de inmediato.

Clientes Electron cloud:

- Si el cambio esta en backend online, aplica de inmediato.
- Si cambia UI o Electron, se publica update.

Clientes Electron local:

- Requieren update del ejecutable/local bundle cuando cambia la logica DTE local.
- Para cambios criticos se debe marcar release obligatoria desde el canal de actualizacion.

## Error humano en licencias

Eliminar en el panel no borra la licencia: la archiva como `SUSPENDED`. Se puede reactivar. Si una
app local ya esta offline, no se bloquea instantaneamente, pero al sincronizar recibe permisos base
firmados y queda degradada.
