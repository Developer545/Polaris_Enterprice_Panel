import { isTipoDte, type TipoDte } from '@pos-dte/shared-types'

export const DTE_NORMATIVE_EFFECTIVE_DATE = '2026-12-01'

export const INVALIDATION_EVENT_VERSION = 3
export const CONTINGENCY_EVENT_VERSION = 4
export const RETORNO_EVENT_VERSION = 1
export const OPERACION_ESPECIAL_EVENT_VERSION = 1

/**
 * CAT-022 Tipos de Operación Especial — DTE 2.0 (vigencia dic 2026)
 */
export const CAT_022_TIPO_OPERACION_ESPECIAL = {
  '01': 'Anticipo',
  '02': 'Permuta',
  '03': 'Retiro de bienes',
  '04': 'Dación en pago',
  '05': 'Autoconsumo',
  '99': 'Otro',
} as const

export type TipoOperacionEspecial = keyof typeof CAT_022_TIPO_OPERACION_ESPECIAL

export const INVALIDATION_NEXT_MONTH_BUSINESS_DAY_TYPES = [
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '15',
  '17',
  '18',
] as const

export const INVALIDATION_THREE_MONTH_TYPES = ['01', '11', '14'] as const

export const CAT_005_TIPO_CONTINGENCIA = {
  NO_DISPONIBILIDAD_MH: 1,
  NO_DISPONIBILIDAD_EMISOR: 2,
  FALLA_INTERNET_EMISOR: 3,
  FALLA_ENERGIA_EMISOR: 4,
  OTRO: 5,
} as const

export const CONTINGENCY_EVENT_DEADLINE_HOURS = 24
export const CONTINGENCY_DTE_BATCH_DEADLINE_HOURS = 72
export const CONTINGENCY_MAX_DOCUMENTS = 1000

export const SV_DTE_DEFAULT_HOLIDAYS_2026 = [
  '2026-01-01',
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-06',
  '2026-05-01',
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-09-15',
  '2026-11-02',
  '2026-12-25',
]

export interface InvalidationDeadlineInput {
  tipoDte: string
  selloReceivedAt: Date | string
  holidays?: readonly string[]
}

export interface InvalidationDeadlineResult {
  tipoDte: string
  rule: 'NEXT_MONTH_10_BUSINESS_DAYS' | 'THREE_MONTHS'
  deadline: Date
}

export class DteComplianceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DteComplianceError'
  }
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new DteComplianceError(`Fecha invalida: ${value}`)
  return date
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function endOfDay(date: Date): Date {
  const result = new Date(date.getTime())
  result.setHours(23, 59, 59, 999)
  return result
}

export function isBusinessDay(date: Date, holidays: readonly string[] = SV_DTE_DEFAULT_HOLIDAYS_2026): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  return !new Set(holidays).has(dateKey(date))
}

export function addBusinessDays(start: Date, businessDays: number, holidays?: readonly string[]): Date {
  if (businessDays < 1) throw new DteComplianceError('businessDays debe ser mayor a cero')

  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  let counted = 0

  while (counted < businessDays) {
    if (isBusinessDay(current, holidays)) counted += 1
    if (counted < businessDays) current.setDate(current.getDate() + 1)
  }

  return endOfDay(current)
}

export function tenthBusinessDayOfNextMonth(stampDate: Date | string, holidays?: readonly string[]): Date {
  const stamped = toDate(stampDate)
  const firstDayOfNextMonth = new Date(stamped.getFullYear(), stamped.getMonth() + 1, 1)
  return addBusinessDays(firstDayOfNextMonth, 10, holidays)
}

export function addMonthsEndOfDay(date: Date | string, months: number): Date {
  const base = toDate(date)
  const result = new Date(base.getFullYear(), base.getMonth() + months, base.getDate())

  if (result.getMonth() !== ((base.getMonth() + months) % 12 + 12) % 12) {
    result.setDate(0)
  }

  return endOfDay(result)
}

export function getInvalidationDeadline(input: InvalidationDeadlineInput): InvalidationDeadlineResult {
  const { tipoDte, selloReceivedAt, holidays } = input

  if ((INVALIDATION_NEXT_MONTH_BUSINESS_DAY_TYPES as readonly string[]).includes(tipoDte)) {
    return {
      tipoDte,
      rule: 'NEXT_MONTH_10_BUSINESS_DAYS',
      deadline: tenthBusinessDayOfNextMonth(selloReceivedAt, holidays),
    }
  }

  if (isTipoDte(tipoDte) && (INVALIDATION_THREE_MONTH_TYPES as readonly TipoDte[]).includes(tipoDte)) {
    return {
      tipoDte,
      rule: 'THREE_MONTHS',
      deadline: addMonthsEndOfDay(selloReceivedAt, 3),
    }
  }

  throw new DteComplianceError(`Tipo DTE/evento no soportado para invalidacion: ${tipoDte}`)
}

export function assertCanInvalidateDte(input: InvalidationDeadlineInput & { now?: Date | string }): void {
  const now = input.now ? toDate(input.now) : new Date()
  const { deadline, rule } = getInvalidationDeadline(input)

  if (now.getTime() > deadline.getTime()) {
    throw new DteComplianceError(
      `Plazo de invalidacion vencido para ${input.tipoDte}. Regla ${rule}; fecha limite ${deadline.toISOString()}`,
    )
  }
}

export function getContingencyEventDeadline(endedAt: Date | string): Date {
  const base = toDate(endedAt)
  return new Date(base.getTime() + CONTINGENCY_EVENT_DEADLINE_HOURS * 60 * 60 * 1000)
}

export function getContingencyBatchDeadline(eventStampedAt: Date | string): Date {
  const base = toDate(eventStampedAt)
  return new Date(base.getTime() + CONTINGENCY_DTE_BATCH_DEADLINE_HOURS * 60 * 60 * 1000)
}

export function assertContingencyBatchSize(totalDocuments: number): void {
  if (!Number.isInteger(totalDocuments) || totalDocuments < 1 || totalDocuments > CONTINGENCY_MAX_DOCUMENTS) {
    throw new DteComplianceError(`El evento de contingencia debe contener de 1 a ${CONTINGENCY_MAX_DOCUMENTS} documentos`)
  }
}
