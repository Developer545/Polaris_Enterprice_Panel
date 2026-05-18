'use client'

/**
 * Returns companyId and branchId stored in localStorage after login.
 * Avoids duplicating the localStorage pattern across every page.
 */
export function useAppContext() {
  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') ?? '') : ''
  const branchId  = typeof window !== 'undefined' ? (localStorage.getItem('branchId')  ?? '') : ''
  return { companyId, branchId }
}
