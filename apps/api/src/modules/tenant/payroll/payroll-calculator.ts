/**
 * payroll-calculator.ts
 * Pure functions — no NestJS dependencies, fully testable.
 * Implements El Salvador payroll deductions for 2024.
 */

export interface PayrollCalcParams {
  salaryBase: number
  horasExtra?: number
  bonos?: number
  aguinaldo?: number
  otrosIngresos?: number
  afpInstitution?: string | null
}

export interface PayrollCalc {
  salaryBase: number
  horasExtra: number
  bonos: number
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

// ─── ISR / Renta — tabla mensual 2024 ────────────────────────────────────────
/**
 * Base gravable = totalBruto - isssEmpleado - afpEmpleado
 * Tramos mensuales:
 *   0     – 487.50  → 0%
 *   487.51– 915.00  → (base - 487.50) × 10%
 *   915.01– 1,395.83→ (base - 915.00) × 20% + 42.75
 *   1,395.84–4,064.58→(base - 1,395.83) × 25% + 138.92
 *   > 4,064.58       → (base - 4,064.58) × 30% + 808.06
 */
function calcRenta(baseGravable: number): number {
  if (baseGravable <= 487.50) return 0
  if (baseGravable <= 915.00) return round2((baseGravable - 487.50) * 0.10)
  if (baseGravable <= 1395.83) return round2((baseGravable - 915.00) * 0.20 + 42.75)
  if (baseGravable <= 4064.58) return round2((baseGravable - 1395.83) * 0.25 + 138.92)
  return round2((baseGravable - 4064.58) * 0.30 + 808.06)
}

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
    aguinaldo = 0,
    otrosIngresos = 0,
  } = params

  const totalBruto = round2(salaryBase + horasExtra + bonos + aguinaldo + otrosIngresos)

  const isssEmpleado = calcIsssEmpleado(totalBruto)
  const afpEmpleado = calcAfpEmpleado(totalBruto)

  const baseGravable = round2(totalBruto - isssEmpleado - afpEmpleado)
  const rentaRetenida = calcRenta(baseGravable)

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
