/**
 * Sistema de apariencia — Polaris Enterprise
 * Controla: tipografía, color de acento y color de texto.
 */

export type FontOption =
  | 'Inter'
  | 'Roboto'
  | 'Poppins'
  | 'Nunito'
  | 'IBM Plex Sans'

export interface AppearanceSettings {
  fontFamily:       FontOption
  customPrimary:    string | null   // hex override, null = usar color del tema
  customTextColor:  string | null   // hex override para texto, null = auto
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

export const PRESET_TEXT_COLORS = [
  '#1a1a2e', '#0f172a', '#1e293b', '#ffffff', '#f1f5f9',
  '#fdf4ff', '#fff0f6', '#fffbeb', '#f0fdf4', '#ecfeff',
]

export const APPEARANCE_STORAGE_KEY = 'polaris-appearance'

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontFamily:      'Inter',
  customPrimary:   null,
  customTextColor: null,
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

/**
 * Generates a full login palette from a hex primary color.
 * Returns accent tones + background tones + text colors for both light/dark designs.
 */
export function generateLoginPalette(hex: string, customTextColor?: string | null) {
  const [h, s] = hexToHsl(hex)
  const sat = Math.max(s, 50)

  // ── Accent tones ──────────────────────────────────────────────
  const lp1 = hslToHex(h, sat,              Math.min(Math.max(hexToHsl(hex)[2], 45), 62))
  const lp2 = hslToHex(h, Math.max(sat - 10, 30), 70)
  const lp3 = hslToHex(h, Math.max(sat - 20, 20), 84)
  const lp4 = hslToHex(h, Math.min(sat + 5, 100), 36)

  // ── Button text contrast ──────────────────────────────────────
  const [rl, gl, bl] = [parseInt(lp1.slice(1,3),16), parseInt(lp1.slice(3,5),16), parseInt(lp1.slice(5,7),16)]
  const lum = (0.299*rl + 0.587*gl + 0.114*bl) / 255
  const lpButtonText = lum > 0.55 ? '#1a1a2e' : '#ffffff'

  // ── Light design palette (aurora, bloom, cloud, petal, candy, spring, steel) ─
  const bgLight      = hslToHex(h, Math.min(sat, 35), 97)    // page bg
  const bgCardLight  = hslToHex(h, Math.min(sat, 18), 99.5)  // card bg
  const bgInputLight = hslToHex(h, Math.min(sat, 28), 98)    // input bg
  const txtHead      = customTextColor ?? hslToHex(h, Math.min(sat, 75), 18)   // headings
  const txtBody      = customTextColor
    ? aHex(customTextColor, 0.70)
    : hslToHex(h, Math.min(sat, 35), 48)  // subtitle/body
  const txtLabel     = customTextColor ?? hslToHex(h, Math.min(sat, 55), 32)   // form labels

  // ── Dark design palette (velvet, carbon, command, forge, nexus, dreamy) ──────
  const bgDark       = hslToHex(h, Math.min(sat, 50), 6)     // page bg
  const bgCardDark   = hslToHex(h, Math.min(sat, 44), 10)    // card bg
  const bgInputDark  = hslToHex(h, Math.min(sat, 48), 8)     // input bg
  const dkTxtHead    = customTextColor ?? hslToHex(h, Math.min(sat, 18), 88)   // headings on dark
  const dkTxtBody    = customTextColor
    ? aHex(customTextColor, 0.60)
    : hslToHex(h, Math.min(sat, 18), 60)   // body on dark
  const dkTxtLabel   = customTextColor
    ? aHex(customTextColor, 0.55)
    : hslToHex(h, Math.min(sat, 20), 52)   // labels on dark

  return {
    lp1, lp2, lp3, lp4, lpButtonText,
    // Alpha variants of lp1
    a10: aHex(lp1, 0.10), a15: aHex(lp1, 0.15), a20: aHex(lp1, 0.20),
    a25: aHex(lp1, 0.25), a30: aHex(lp1, 0.30), a35: aHex(lp1, 0.35),
    a40: aHex(lp1, 0.40), a50: aHex(lp1, 0.50), a55: aHex(lp1, 0.55),
    a70: aHex(lp1, 0.70),
    // Light design
    bgLight, bgCardLight, bgInputLight,
    txtHead, txtBody, txtLabel,
    // Dark design
    bgDark, bgCardDark, bgInputDark,
    dkTxtHead, dkTxtBody, dkTxtLabel,
  }
}

/** Applies all login palette CSS vars to :root */
export function applyLoginPalette(hex: string, customTextColor?: string | null): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const p = generateLoginPalette(hex, customTextColor)

  // Accent + alpha
  root.style.setProperty('--lp-1',    p.lp1)
  root.style.setProperty('--lp-2',    p.lp2)
  root.style.setProperty('--lp-3',    p.lp3)
  root.style.setProperty('--lp-4',    p.lp4)
  root.style.setProperty('--lp-btn-text', p.lpButtonText)
  root.style.setProperty('--lp-text',     p.lpButtonText)   // legacy alias used by some designs
  root.style.setProperty('--lp-a10',  p.a10)
  root.style.setProperty('--lp-a15',  p.a15)
  root.style.setProperty('--lp-a20',  p.a20)
  root.style.setProperty('--lp-a25',  p.a25)
  root.style.setProperty('--lp-a30',  p.a30)
  root.style.setProperty('--lp-a35',  p.a35)
  root.style.setProperty('--lp-a40',  p.a40)
  root.style.setProperty('--lp-a50',  p.a50)
  root.style.setProperty('--lp-a55',  p.a55)
  root.style.setProperty('--lp-a70',  p.a70)

  // Light design backgrounds
  root.style.setProperty('--lp-bg',         p.bgLight)
  root.style.setProperty('--lp-bg-card',    p.bgCardLight)
  root.style.setProperty('--lp-bg-input',   p.bgInputLight)

  // Light design text
  root.style.setProperty('--lp-txt-h',      p.txtHead)
  root.style.setProperty('--lp-txt-b',      p.txtBody)
  root.style.setProperty('--lp-txt-l',      p.txtLabel)

  // Dark design backgrounds
  root.style.setProperty('--lp-dk-bg',      p.bgDark)
  root.style.setProperty('--lp-dk-card',    p.bgCardDark)
  root.style.setProperty('--lp-dk-input',   p.bgInputDark)

  // Dark design text
  root.style.setProperty('--lp-dk-txt-h',   p.dkTxtHead)
  root.style.setProperty('--lp-dk-txt-b',   p.dkTxtBody)
  root.style.setProperty('--lp-dk-txt-l',   p.dkTxtLabel)
}

/** Aplica variables CSS al :root según los settings */
export function applyAppearance(s: AppearanceSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--font-family', FONT_VAR_MAP[s.fontFamily])
  // Always apply login palette — use customPrimary if set, else default purple
  const primaryColor = s.customPrimary ?? '#7C3AED'
  applyLoginPalette(primaryColor, s.customTextColor)
  if (s.customPrimary) {
    root.style.setProperty('--brand-primary', s.customPrimary)
    root.style.setProperty('--brand-primary-light', s.customPrimary + '22')
  }
}

/** Devuelve los tokens de Ant Design para los settings actuales */
export function getAntTokens(s: AppearanceSettings) {
  return { fontFamily: FONT_VAR_MAP[s.fontFamily] }
}
