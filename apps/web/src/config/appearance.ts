/**
 * Sistema de apariencia — Polaris Enterprise
 * Controla: tipografía y color de acento (paleta login incluida).
 */

export type FontOption =
  | 'Inter'
  | 'Roboto'
  | 'Poppins'
  | 'Nunito'
  | 'IBM Plex Sans'

export interface AppearanceSettings {
  fontFamily:    FontOption
  customPrimary: string | null   // hex override, null = usar color del tema
}

export const FONT_OPTIONS: { id: FontOption; label: string; preview: string }[] = [
  { id: 'Inter',         label: 'Inter',        preview: 'Limpio y moderno' },
  { id: 'Roboto',        label: 'Roboto',        preview: 'Estilo Material' },
  { id: 'Poppins',       label: 'Poppins',       preview: 'Geométrico suave' },
  { id: 'Nunito',        label: 'Nunito',        preview: 'Redondeado amigable' },
  { id: 'IBM Plex Sans', label: 'IBM Plex Sans', preview: 'Técnico preciso' },
]

export const PRESET_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#e11d48', '#ea580c',
  '#d97706', '#059669', '#0d9488', '#0284c7', '#475569',
]

export const APPEARANCE_STORAGE_KEY = 'polaris-appearance'

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontFamily:    'Inter',
  customPrimary: null,
}

/** Maps font names → next/font CSS variable references */
export const FONT_VAR_MAP: Record<FontOption, string> = {
  'Inter':         'var(--font-inter)',
  'Roboto':        'var(--font-roboto)',
  'Poppins':       'var(--font-poppins)',
  'Nunito':        'var(--font-nunito)',
  'IBM Plex Sans': 'var(--font-ibm-plex-sans)',
}

// ─── Color palette generation ────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function aHex(hex: string, pct: number): string {
  return hex + Math.round(255 * pct).toString(16).padStart(2, '0')
}

/** Generates a 4-tone login palette from a hex primary color */
export function generateLoginPalette(hex: string) {
  const [h, s, l] = hexToHsl(hex)
  const sat = Math.max(s, 50)
  const lp1 = hslToHex(h, sat, Math.min(Math.max(l, 45), 62))
  const lp2 = hslToHex(h, Math.max(sat - 10, 30), 70)
  const lp3 = hslToHex(h, Math.max(sat - 20, 20), 84)
  const lp4 = hslToHex(h, Math.min(sat + 5, 100), 36)
  const rl = parseInt(lp1.slice(1, 3), 16)
  const gl = parseInt(lp1.slice(3, 5), 16)
  const bl = parseInt(lp1.slice(5, 7), 16)
  const lum = (0.299 * rl + 0.587 * gl + 0.114 * bl) / 255
  const lpText = lum > 0.55 ? '#1a1a2e' : '#ffffff'
  return { lp1, lp2, lp3, lp4, lpText,
    a10: aHex(lp1, 0.10), a15: aHex(lp1, 0.15), a20: aHex(lp1, 0.20),
    a25: aHex(lp1, 0.25), a30: aHex(lp1, 0.30), a35: aHex(lp1, 0.35),
    a40: aHex(lp1, 0.40), a50: aHex(lp1, 0.50), a55: aHex(lp1, 0.55),
    a70: aHex(lp1, 0.70),
  }
}

/** Applies login palette CSS vars to :root from a hex primary color */
export function applyLoginPalette(hex: string): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const p = generateLoginPalette(hex)
  root.style.setProperty('--lp-1',   p.lp1)
  root.style.setProperty('--lp-2',   p.lp2)
  root.style.setProperty('--lp-3',   p.lp3)
  root.style.setProperty('--lp-4',   p.lp4)
  root.style.setProperty('--lp-text', p.lpText)
  root.style.setProperty('--lp-a10', p.a10)
  root.style.setProperty('--lp-a15', p.a15)
  root.style.setProperty('--lp-a20', p.a20)
  root.style.setProperty('--lp-a25', p.a25)
  root.style.setProperty('--lp-a30', p.a30)
  root.style.setProperty('--lp-a35', p.a35)
  root.style.setProperty('--lp-a40', p.a40)
  root.style.setProperty('--lp-a50', p.a50)
  root.style.setProperty('--lp-a55', p.a55)
  root.style.setProperty('--lp-a70', p.a70)
}

/** Aplica variables CSS al :root según los settings */
export function applyAppearance(s: AppearanceSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--font-family', FONT_VAR_MAP[s.fontFamily])
  if (s.customPrimary) {
    root.style.setProperty('--brand-primary', s.customPrimary)
    root.style.setProperty('--brand-primary-light', s.customPrimary + '22')
    applyLoginPalette(s.customPrimary)
  }
}

/** Devuelve los tokens de Ant Design para los settings actuales */
export function getAntTokens(s: AppearanceSettings) {
  return { fontFamily: FONT_VAR_MAP[s.fontFamily] }
}
