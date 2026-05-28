import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import {
  DTE_SCHEMA_NAME_BY_TYPE,
  DTE_VERSION_BY_TYPE,
  isTipoDte,
  type TipoDte,
} from '@pos-dte/shared-types'
import { DTE_JSON_SCHEMAS } from './schemas'

const ajv = new Ajv({
  allErrors: true,
  strict: false,
})
addFormats(ajv)

const validators = new Map<TipoDte, ValidateFunction>()

export interface DteSchemaIssue {
  path: string
  message: string
}

export interface DteValidationResult {
  ok: boolean
  tipoDte?: TipoDte
  expectedVersion?: number
  schemaName?: string
  issues: DteSchemaIssue[]
}

export class DteSchemaValidationError extends Error {
  constructor(readonly result: DteValidationResult) {
    const details = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ')
    super(`DTE no cumple schema ${result.schemaName ?? 'desconocido'}: ${details}`)
    this.name = 'DteSchemaValidationError'
  }
}

function getValidator(tipoDte: TipoDte): ValidateFunction {
  const existing = validators.get(tipoDte)
  if (existing) return existing

  const validator = ajv.compile(DTE_JSON_SCHEMAS[tipoDte])
  validators.set(tipoDte, validator)
  return validator
}

function formatIssues(errors: ErrorObject[] | null | undefined): DteSchemaIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    message: error.message ?? 'error de validacion',
  }))
}

function getPayloadTipoDte(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const identificacion = (payload as Record<string, unknown>).identificacion
  if (!identificacion || typeof identificacion !== 'object') return undefined
  const tipoDte = (identificacion as Record<string, unknown>).tipoDte
  return typeof tipoDte === 'string' ? tipoDte : undefined
}

export function validateDteJson(payload: unknown, expectedTipoDte?: string): DteValidationResult {
  const tipoDte = expectedTipoDte ?? getPayloadTipoDte(payload)

  if (!tipoDte || !isTipoDte(tipoDte)) {
    return {
      ok: false,
      issues: [{
        path: '/identificacion/tipoDte',
        message: `tipoDte no soportado: ${tipoDte ?? '(vacio)'}`,
      }],
    }
  }

  const validator = getValidator(tipoDte)
  const ok = validator(payload)

  return {
    ok,
    tipoDte,
    expectedVersion: DTE_VERSION_BY_TYPE[tipoDte],
    schemaName: DTE_SCHEMA_NAME_BY_TYPE[tipoDte],
    issues: ok ? [] : formatIssues(validator.errors),
  }
}

export function assertValidDteJson(payload: unknown, expectedTipoDte?: string): asserts payload {
  const result = validateDteJson(payload, expectedTipoDte)
  if (!result.ok) throw new DteSchemaValidationError(result)
}
