'use client'
import { useState, useEffect } from 'react'

/**
 * Returns companyId and branchId stored in localStorage after login.
 * Uses state + effect to avoid SSR/client hydration mismatch.
 */
export function useAppContext() {
  const [companyId, setCompanyId] = useState('')
  const [branchId,  setBranchId]  = useState('')

  useEffect(() => {
    setCompanyId(localStorage.getItem('companyId') ?? '')
    setBranchId(localStorage.getItem('branchId')   ?? '')
  }, [])

  return { companyId, branchId }
}
