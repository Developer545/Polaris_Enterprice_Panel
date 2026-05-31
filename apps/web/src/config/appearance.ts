/**
 * Sistema de apariencia personalizable — Polaris Enterprise
 * Controla: tipografía, tamaño de texto, bordes, densidad y color de acento.
 */

export type FontOption =
  | 'Inter'
  | 'Roboto'
  | 'Poppins'
  | 'Nunito'
  | 'IBM Plex Sans'

export interface AppearanceSettings {
  fontFamily:    FontOption
  fontSize:      13 | 14 | 15 | 16
  borderRadius:  2 | 6 | 10 | 16
  density:       'compact' | 'default' | 'comfortable'
  customPrimary: string | null   // hex override, null = usar color del tema
}

export const FONT_OPTIONS: { id: FontOption; label: string; preview: string }[] = [
  { id: 'Inter',         label: 'Inter',        preview: 'Aa 123 — Limpio' },
  { id: 'Roboto',        label: 'Roboto',        preview: 'Aa 123 — Material' },
  { id: 'Poppins',       label: 'Poppins',       preview: 'Aa 123 — Moderno' },
  { id: 'Nunito',        label: 'Nunito',        preview: 'Aa 123 — Amigable' },
  { id: 'IBM Plex Sans', label: 'IBM Plex Sans', preview: 'Aa 123 — Técnico' },
]

export const FONT_SIZE_OPTIONS: { value: 13 | 14 | 15 | 16; label: string }[] = [
  { value: 13, label: 'S' },
  { value: 14, label: 'M' },
  { value: 15, label: 'L' },
  { value: 16, label: 'XL' },
]

export const BORDER_RADIUS_OPTIONS: { value: 2 | 6 | 10 | 16; label: string; icon: string }[] = [
  { value: 2,  label: 'Recto',       icon: '▢' },
  { value: 6,  label: 'Suave',       icon: '▣' },
  { value: 10, label: 'Redondeado',  icon: '⬛' },
  { value: 16, label: 'Píldora',     icon: '⬤' },
]

export const DENSITY_OPTIONS: { value: 'compact' | 'default' | 'comfortable'; label: string; desc: string }[] = [
  { value: 'compact',     label: 'Compacto',   desc: 'Más filas visibles' },
  { value: 'default',     label: 'Estándar',   desc: 'Equilibrado' },
  { value: 'comfortable', label: 'Cómodo',     desc: 'Más espacio' },
]

export const PRESET_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#e11d48', '#ea580c',
  '#d97706', '#059669', '#0d9488', '#0284c7', '#475569',
]

export const APPEARANCE_STORAGE_KEY = 'polaris-appearance'

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontFamily:    'Inter',
  fontSize:      14,
  borderRadius:  6,
  density:       'default',
  customPrimary: null,
}

/** Maps font names to their next/font CSS variable references */
const FONT_VAR_MAP: Record<FontOption, string> = {
  'Inter':         'var(--font-inter)',
  'Roboto':        'var(--font-roboto)',
  'Poppins':       'var(--font-poppins)',
  'Nunito':        'var(--font-nunito)',
  'IBM Plex Sans': 'var(--font-ibm-plex-sans)',
}

/** Aplica variables CSS al :root según los settings de apariencia */
export function applyAppearance(s: AppearanceSettings): void {
  const root = document.documentElement
  root.style.setProperty('--font-family', FONT_VAR_MAP[s.fontFamily])
  root.style.setProperty('--font-size-base', `${s.fontSize}px`)
  root.style.setProperty('--border-radius-base', `${s.borderRadius}px`)
  root.setAttribute('data-density', s.density)
  if (s.customPrimary) {
    root.style.setProperty('--brand-primary', s.customPrimary)
    root.style.setProperty('--brand-primary-light', s.customPrimary + '22')
  }
}

/** Devuelve los tokens de Ant Design para los settings actuales */
export function getAntTokens(s: AppearanceSettings) {
  const density = {
    compact:     { controlHeight: 28, sizeStep: -1 },
    default:     { controlHeight: 34, sizeStep: 0  },
    comfortable: { controlHeight: 40, sizeStep: 1  },
  }[s.density]

  return {
    fontFamily:     FONT_VAR_MAP[s.fontFamily],
    fontSize:       s.fontSize + density.sizeStep,
    borderRadius:   s.borderRadius,
    borderRadiusLG: Math.round(s.borderRadius * 1.5),
    borderRadiusSM: Math.max(s.borderRadius - 2, 2),
    borderRadiusXS: Math.max(s.borderRadius - 4, 2),
    controlHeight:  density.controlHeight,
  }
}
