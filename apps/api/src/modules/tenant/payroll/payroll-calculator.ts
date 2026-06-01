/**
 * payroll-calculator.ts
 * Pure functions — no NestJS dependencies, fully testable.
 * Implements El Salvador payroll deductions.
 *
 * ⚠️  ACTUALIZACIÓN ANUAL:
 *  1. Agregar entrada en ISR_TABLES con el año fiscal nuevo
 *  2. Las tasas ISSS/AFP/INSAFORP se actualizan en sus constantes si cambian
 *  3. Fuente oficial: https://www.dgii.gob.sv/tablas-de-retencion/
 */

export interface PayrollCalcParams {
  salaryBase: number
  horasExtra?: number
  bonos?: number
  comisiones?: number
  aguinaldo?: number
  otrosIngresos?: number
  afpInstitution?: string | null
  fiscalYear?: number   // defaults to current year; set for retroactive calculations
}

export interface PayrollCalc {
  salaryBase: number
  horasExtra: number
  bonos: number
  comisiones: number
  aguinaldo: number
  otrosIngresos: number
  totalBruto: number
  // Employee deductions
  isssEmpleado: number
  afpEmpleado: number
  rentaRetenida: number
  otrosDeducciones: number
  totalDeducciones: number
  salarioNeto: number
  // Employer contributions
  isssPatronal: number
  afpPatronal: number
  insaforp: number
}

// ─── ISSS ─────────────────────────────────────────────────────────────────────
const ISSS_RATE_EMPLEADO = 0.03
const ISSS_RATE_PATRONAL = 0.075
const ISSS_TOPE = 1000 // max base mensual

function calcIsssEmpleado(totalBruto: number): number {
  const base = Math.min(totalBruto, ISSS_TOPE)
  return round2(base * ISSS_RATE_EMPLEADO)
}

function calcIsssPatronal(totalBruto: number): number {
  const base = Math.min(totalBruto, ISSS_TOPE)
  return round2(base * ISSS_RATE_PATRONAL)
}

// ─── AFP ──────────────────────────────────────────────────────────────────────
const AFP_EMPLEADO_RATE = 0.0725  // 7.25% — sin tope 2024
const AFP_PATRONAL_RATE = 0.0775  // 7.75%

function calcAfpEmpleado(totalBruto: number): number {
  return round2(totalBruto * AFP_EMPLEADO_RATE)
}

function calcAfpPatronal(totalBruto: number): number {
  return round2(totalBruto * AFP_PATRONAL_RATE)
}

// ─── ISR / Renta — tablas mensuales por año fiscal ───────────────────────────
// Fuente: DGII El Salvador — Tablas de Retención del Impuesto sobre la Renta
// Tramo: { desde, hasta (null = sin límite), tasa, cuotaFija }

interface IsrTramo {
  desde: number
  hasta: number | null
  tasa: number
  cuotaFija: number
}

const ISR_TABLES: Record<number, IsrTramo[]> = {
  // ── 2024 ──────────────────────────────────────────────────────────────────
  2024: [
    { desde: 0,       hasta: 487.50,   tasa: 0,    cuotaFija: 0       },
    { desde: 487.51,  hasta: 915.00,   tasa: 0.10, cuotaFija: 0       },
    { desde: 915.01,  hasta: 1395.83,  tasa: 0.20, cuotaFija: 42.75   },
    { desde: 1395.84, hasta: 4064.58,  tasa: 0.25, cuotaFija: 138.92  },
    { desde: 4064.59, hasta: null,      tasa: 0.30, cuotaFija: 808.06  },
  ],
  // ── 2025 — actualizar cuando DGII publique nuevas tablas ──────────────────
  // 2025: [...],
}

function getIsrTable(year: number): IsrTramo[] {
  // Usar tabla del año exacto; si no existe, usar la más reciente disponible
  if (ISR_TABLES[year]) return ISR_TABLES[year]
  const available = Object.keys(ISR_TABLES).map(Number).sort((a, b) => b - a)
  return ISR_TABLES[available[0]]
}

function calcRenta(baseGravable: number, year = new Date().getFullYear()): number {
  const table = getIsrTable(year)
  for (const tramo of [...table].reverse()) {
    if (baseGravable >= tramo.desde) {
      return round2((baseGravable - tramo.desde) * tramo.tasa + tramo.cuotaFija)
    }
  }
  return 0
}

export { getIsrTable, ISR_TABLES }
export type { IsrTramo }

// ─── INSAFORP ─────────────────────────────────────────────────────────────────
const INSAFORP_RATE = 0.01
const INSAFORP_TOPE = 1000

function calcInsaforp(totalBruto: number): number {
  const base = Math.min(totalBruto, INSAFORP_TOPE)
  return round2(base * INSAFORP_RATE)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function calcPayrollItem(params: PayrollCalcParams): PayrollCalc {
  const {
    salaryBase,
    horasExtra = 0,
    bonos = 0,
    comisiones = 0,
    aguinaldo = 0,
    otrosIngresos = 0,
    fiscalYear = new Date().getFullYear(),
  } = params

  const totalBruto = round2(salaryBase + horasExtra + bonos + comisiones + aguinaldo + otrosIngresos)

  const isssEmpleado = calcIsssEmpleado(totalBruto)
  const afpEmpleado = calcAfpEmpleado(totalBruto)

  const baseGravable = round2(totalBruto - isssEmpleado - afpEmpleado)
  const rentaRetenida = calcRenta(baseGravable, fiscalYear)

  const otrosDeducciones = 0
  const totalDeducciones = round2(isssEmpleado + afpEmpleado + rentaRetenida + otrosDeducciones)
  const salarioNeto = round2(totalBruto - totalDeducciones)

  const isssPatronal = calcIsssPatronal(totalBruto)
  const afpPatronal = calcAfpPatronal(totalBruto)
  const insaforp = calcInsaforp(totalBruto)

  return {
    salaryBase,
    horasExtra,
    bonos,
    comisiones,
    aguinaldo,
    otrosIngresos,
    totalBruto,
    isssEmpleado,
    afpEmpleado,
    rentaRetenida,
    otrosDeducciones,
    totalDeducciones,
    salarioNeto,
    isssPatronal,
    afpPatronal,
    insaforp,
  }
}
