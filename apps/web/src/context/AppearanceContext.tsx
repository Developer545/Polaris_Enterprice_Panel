'use client'

import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react'
import {
  AppearanceSettings,
  DEFAULT_APPEARANCE,
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
} from '@/config/appearance'

interface AppearanceContextValue {
  appearance:      AppearanceSettings
  setAppearance:   (partial: Partial<AppearanceSettings>) => void
  resetAppearance: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearanceSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_APPEARANCE
    try {
      const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY)
      if (saved) return { ...DEFAULT_APPEARANCE, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_APPEARANCE
  })

  // Aplica CSS vars al :root en cada cambio
  useEffect(() => {
    applyAppearance(appearance)
  }, [appearance])

  const setAppearance = useCallback((partial: Partial<AppearanceSettings>) => {
    setAppearanceState(prev => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const resetAppearance = useCallback(() => {
    setAppearanceState(DEFAULT_APPEARANCE)
    try { localStorage.removeItem(APPEARANCE_STORAGE_KEY) } catch {}
  }, [])

  const value = useMemo<AppearanceContextValue>(
    () => ({ appearance, setAppearance, resetAppearance }),
    [appearance, setAppearance, resetAppearance],
  )

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance debe usarse dentro de <AppearanceProvider>')
  return ctx
}
