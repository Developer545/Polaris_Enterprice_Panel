'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Tenant creation moved to drawer on /tenants page
export default function NewTenantRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/tenants') }, [router])
  return null
}
