-- Align local license modules with the central module registry.
-- This migration keeps existing paid add-ons and appends the base bundle.

ALTER TABLE "License"
  ADD COLUMN IF NOT EXISTS "licenseRevision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "License"
  ALTER COLUMN "enabledModules"
  SET DEFAULT ARRAY[
    'dashboard',
    'pos',
    'ventas',
    'dte',
    'turnos_caja',
    'clientes',
    'proveedores',
    'inventario',
    'productos',
    'servicios'
  ];

UPDATE "License"
SET "enabledModules" = ARRAY(
  SELECT DISTINCT module_id
  FROM unnest(
    "enabledModules" || ARRAY[
      'dashboard',
      'pos',
      'ventas',
      'dte',
      'turnos_caja',
      'clientes',
      'proveedores',
      'inventario',
      'productos',
      'servicios'
    ]
  ) AS module_id
)
WHERE NOT (
  "enabledModules" @> ARRAY[
    'dashboard',
    'pos',
    'ventas',
    'dte',
    'turnos_caja',
    'clientes',
    'proveedores',
    'inventario',
    'productos',
    'servicios'
  ]
);
