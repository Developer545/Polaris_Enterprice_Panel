import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DTE_NORMATIVE_EFFECTIVE_DATE,
  getInvalidationDeadline,
  INVALIDATION_EVENT_VERSION,
  CONTINGENCY_EVENT_VERSION,
  SV_DTE_DEFAULT_HOLIDAYS_2026,
} from '../index'

test('keeps DTE 2026 effective date configurable', () => {
  assert.equal(DTE_NORMATIVE_EFFECTIVE_DATE, '2026-12-01')
  assert.equal(INVALIDATION_EVENT_VERSION, 3)
  assert.equal(CONTINGENCY_EVENT_VERSION, 4)
})

test('calculates invalidation deadline for next-month 10 business-day rule', () => {
  const result = getInvalidationDeadline({
    tipoDte: '03',
    selloReceivedAt: new Date('2026-03-19T07:30:00-06:00'),
    holidays: SV_DTE_DEFAULT_HOLIDAYS_2026,
  })

  assert.equal(result.rule, 'NEXT_MONTH_10_BUSINESS_DAYS')
  assert.equal(result.deadline.getFullYear(), 2026)
  assert.equal(result.deadline.getMonth(), 3)
  assert.equal(result.deadline.getDate(), 20)
  assert.equal(result.deadline.getHours(), 23)
  assert.equal(result.deadline.getMinutes(), 59)
})

test('calculates invalidation deadline for May 2026 with labor day holiday', () => {
  const result = getInvalidationDeadline({
    tipoDte: '03',
    selloReceivedAt: new Date('2026-04-25T00:30:00-06:00'),
    holidays: SV_DTE_DEFAULT_HOLIDAYS_2026,
  })

  assert.equal(result.deadline.getFullYear(), 2026)
  assert.equal(result.deadline.getMonth(), 4)
  assert.equal(result.deadline.getDate(), 15)
})

test('calculates invalidation deadline for three-month DTE types', () => {
  const result = getInvalidationDeadline({
    tipoDte: '01',
    selloReceivedAt: new Date('2025-11-11T07:30:00-06:00'),
  })

  assert.equal(result.rule, 'THREE_MONTHS')
  assert.equal(result.deadline.getFullYear(), 2026)
  assert.equal(result.deadline.getMonth(), 1)
  assert.equal(result.deadline.getDate(), 11)
  assert.equal(result.deadline.getHours(), 23)
})
