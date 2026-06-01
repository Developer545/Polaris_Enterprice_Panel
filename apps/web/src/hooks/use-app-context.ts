'use client'
import { useState, useEffect } from 'react'

function readLS(key: string) {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) ?? ''
}

/** Parses branchIds JSON array and returns the first element as branchId. */
function readFirstBranchId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem('branchIds')
    if (!raw) return ''
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : ''
  } catch {
    return ''
  }
}

/**
 * Returns companyId and branchId stored in localStorage after login.
 * branchId is derived from branchIds[0] (login stores array, not singular).
 */
export function useAppContext() {
  const [companyId, setCompanyId] = useState<string>(() => readLS('companyId'))
  const [branchId,  setBranchId]  = useState<string>(() => readFirstBranchId())

  // Keep in sync if localStorage changes in the same tab (e.g. after login)
  useEffect(() => {
    const id = readLS('companyId')
    const br = readFirstBranchId()
    if (id) setCompanyId(id)
    if (br) setBranchId(br)
  }, [])

  return { companyId, branchId }
}
