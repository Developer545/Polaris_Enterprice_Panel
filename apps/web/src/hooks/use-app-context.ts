'use client'
import { useState, useEffect } from 'react'

function readLS(key: string) {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) ?? ''
}

/**
 * Returns companyId and branchId stored in localStorage after login.
 * Lazy initializer reads synchronously on first client render so React Query
 * fires with the real key immediately — no loading flash on navigation.
 */
export function useAppContext() {
  const [companyId, setCompanyId] = useState<string>(() => readLS('companyId'))
  const [branchId,  setBranchId]  = useState<string>(() => readLS('branchId'))

  // Keep in sync if localStorage changes in the same tab (e.g. after login)
  useEffect(() => {
    const id = readLS('companyId')
    const br = readLS('branchId')
    if (id) setCompanyId(id)
    if (br) setBranchId(br)
  }, [])

  return { companyId, branchId }
}
