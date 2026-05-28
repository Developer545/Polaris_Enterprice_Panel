/**
 * Sistema de temas visual para Polaris Enterprise ERP/POS.
 * Usa variables CSS con valores hex completos para máxima claridad.
 * Se aplican con document.documentElement.style.setProperty()
 *
 * 10 temas claros + 10 temas oscuros = 20 en total.
 */

export interface PolarisTheme {
  id: string
  name: string
  emoji: string
  description: string
  isDark: boolean
  colorPrimary: string         // hex para Ant Design ConfigProvider
  preview: [string, string, string]  // [sidebarHex, primaryHex, contentHex]
  vars: Record<string, string> // valores CSS variables (hex completo)
}

// ─── Helper: aplica el tema al :root ────────────────────────────────────────
export function applyPolarisTheme(theme: PolarisTheme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
  root.setAttribute('data-theme', theme.id)
}

export function getThemeById(id: string): PolarisTheme {
  return POLARIS_THEMES.find(t => t.id === id) ?? POLARIS_THEMES[0]
}

export const DEFAULT_THEME_ID = 'polaris-blue'

// ─── CATÁLOGO DE TEMAS ───────────────────────────────────────────────────────

export const POLARIS_THEMES: PolarisTheme[] = [

  // ══════════════════════════════════════════════════════════════
  // TEMAS CLAROS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'polaris-blue',
    name: 'Polaris Blue',
    emoji: '🔷',
    description: 'Azul índigo elegante — predeterminado',
    isDark: false,
    colorPrimary: '#2563eb',
    preview: ['#f8f9fc', '#2563eb', '#f1f5f9'],
    vars: {
      '--brand-primary':            '#2563eb',
      '--brand-primary-light':      '#dbeafe',
      '--sidebar-bg':               '#f8f9fc',
      '--sidebar-fg':               '#1e293b',
      '--sidebar-muted':            '#94a3b8',
      '--sidebar-border':           '#e2e8f0',
      '--sidebar-item-active-bg':   '#dbeafe',
      '--sidebar-item-active-color':'#2563eb',
      '--sidebar-item-hover-bg':    '#f1f5f9',
      '--bg-page':                  '#f1f5f9',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#1e293b',
      '--text-secondary':           '#64748b',
    },
  },

  {
    id: 'emerald',
    name: 'Emerald ERP',
    emoji: '🌿',
    description: 'Verde profesional — fresco y moderno',
    isDark: false,
    colorPrimary: '#059669',
    preview: ['#f5fbf8', '#059669', '#f0faf5'],
    vars: {
      '--brand-primary':            '#059669',
      '--brand-primary-light':      '#d1fae5',
      '--sidebar-bg':               '#f5fbf8',
      '--sidebar-fg':               '#064e3b',
      '--sidebar-muted':            '#6ee7b7',
      '--sidebar-border':           '#a7f3d0',
      '--sidebar-item-active-bg':   '#d1fae5',
      '--sidebar-item-active-color':'#059669',
      '--sidebar-item-hover-bg':    '#ecfdf5',
      '--bg-page':                  '#f0faf5',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#064e3b',
      '--text-secondary':           '#047857',
    },
  },

  {
    id: 'amber',
    name: 'Amber POS',
    emoji: '🟧',
    description: 'Naranja Speeddan — marca corporativa',
    isDark: false,
    colorPrimary: '#f47920',
    preview: ['#fdf8f4', '#f47920', '#fef3e8'],
    vars: {
      '--brand-primary':            '#f47920',
      '--brand-primary-light':      '#fed7aa',
      '--sidebar-bg':               '#fdf8f4',
      '--sidebar-fg':               '#431407',
      '--sidebar-muted':            '#c2410c',
      '--sidebar-border':           '#fed7aa',
      '--sidebar-item-active-bg':   '#ffedd5',
      '--sidebar-item-active-color':'#ea580c',
      '--sidebar-item-hover-bg':    '#fff7ed',
      '--bg-page':                  '#fef3e8',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#431407',
      '--text-secondary':           '#9a3412',
    },
  },

  {
    id: 'slate',
    name: 'Slate Pro',
    emoji: '🔩',
    description: 'Gris pizarra neutral — minimalista limpio',
    isDark: false,
    colorPrimary: '#475569',
    preview: ['#f8fafc', '#475569', '#f1f5f9'],
    vars: {
      '--brand-primary':            '#475569',
      '--brand-primary-light':      '#e2e8f0',
      '--sidebar-bg':               '#f8fafc',
      '--sidebar-fg':               '#0f172a',
      '--sidebar-muted':            '#94a3b8',
      '--sidebar-border':           '#cbd5e1',
      '--sidebar-item-active-bg':   '#e2e8f0',
      '--sidebar-item-active-color':'#334155',
      '--sidebar-item-hover-bg':    '#f1f5f9',
      '--bg-page':                  '#f1f5f9',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#0f172a',
      '--text-secondary':           '#475569',
    },
  },

  {
    id: 'violet',
    name: 'Violet Suite',
    emoji: '💜',
    description: 'Púrpura moderno — profesional y dinámico',
    isDark: false,
    colorPrimary: '#7c3aed',
    preview: ['#faf5ff', '#7c3aed', '#f5f3ff'],
    vars: {
      '--brand-primary':            '#7c3aed',
      '--brand-primary-light':      '#ede9fe',
      '--sidebar-bg':               '#faf5ff',
      '--sidebar-fg':               '#2e1065',
      '--sidebar-muted':            '#a78bfa',
      '--sidebar-border':           '#ddd6fe',
      '--sidebar-item-active-bg':   '#ede9fe',
      '--sidebar-item-active-color':'#7c3aed',
      '--sidebar-item-hover-bg':    '#f5f3ff',
      '--bg-page':                  '#f5f3ff',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#2e1065',
      '--text-secondary':           '#6d28d9',
    },
  },

  {
    id: 'rose',
    name: 'Rose Garden',
    emoji: '🌸',
    description: 'Rosa elegante — moderno y fresco',
    isDark: false,
    colorPrimary: '#e11d48',
    preview: ['#fff5f7', '#e11d48', '#fff1f2'],
    vars: {
      '--brand-primary':            '#e11d48',
      '--brand-primary-light':      '#ffe4e6',
      '--sidebar-bg':               '#fff5f7',
      '--sidebar-fg':               '#4c0519',
      '--sidebar-muted':            '#fb7185',
      '--sidebar-border':           '#fecdd3',
      '--sidebar-item-active-bg':   '#ffe4e6',
      '--sidebar-item-active-color':'#e11d48',
      '--sidebar-item-hover-bg':    '#fff1f2',
      '--bg-page':                  '#fff1f2',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#4c0519',
      '--text-secondary':           '#be123c',
    },
  },

  {
    id: 'teal',
    name: 'Teal Pro',
    emoji: '🩵',
    description: 'Verde azulado — fresco y tecnológico',
    isDark: false,
    colorPrimary: '#0d9488',
    preview: ['#f0fdfa', '#0d9488', '#f0fdfa'],
    vars: {
      '--brand-primary':            '#0d9488',
      '--brand-primary-light':      '#ccfbf1',
      '--sidebar-bg':               '#f0fdfa',
      '--sidebar-fg':               '#134e4a',
      '--sidebar-muted':            '#5eead4',
      '--sidebar-border':           '#99f6e4',
      '--sidebar-item-active-bg':   '#ccfbf1',
      '--sidebar-item-active-color':'#0d9488',
      '--sidebar-item-hover-bg':    '#f0fdfa',
      '--bg-page':                  '#f0fdfa',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#134e4a',
      '--text-secondary':           '#0f766e',
    },
  },

  {
    id: 'sky',
    name: 'Sky Light',
    emoji: '☁️',
    description: 'Azul cielo aireado — limpio y moderno',
    isDark: false,
    colorPrimary: '#0284c7',
    preview: ['#f0f9ff', '#0284c7', '#e0f2fe'],
    vars: {
      '--brand-primary':            '#0284c7',
      '--brand-primary-light':      '#e0f2fe',
      '--sidebar-bg':               '#f0f9ff',
      '--sidebar-fg':               '#0c4a6e',
      '--sidebar-muted':            '#7dd3fc',
      '--sidebar-border':           '#bae6fd',
      '--sidebar-item-active-bg':   '#e0f2fe',
      '--sidebar-item-active-color':'#0284c7',
      '--sidebar-item-hover-bg':    '#f0f9ff',
      '--bg-page':                  '#f0f9ff',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#0c4a6e',
      '--text-secondary':           '#0369a1',
    },
  },

  {
    id: 'gold',
    name: 'Gold Premium',
    emoji: '✨',
    description: 'Dorado ámbar — premium y sofisticado',
    isDark: false,
    colorPrimary: '#d97706',
    preview: ['#fffbeb', '#d97706', '#fef3c7'],
    vars: {
      '--brand-primary':            '#d97706',
      '--brand-primary-light':      '#fef3c7',
      '--sidebar-bg':               '#fffbeb',
      '--sidebar-fg':               '#451a03',
      '--sidebar-muted':            '#fcd34d',
      '--sidebar-border':           '#fde68a',
      '--sidebar-item-active-bg':   '#fef3c7',
      '--sidebar-item-active-color':'#d97706',
      '--sidebar-item-hover-bg':    '#fffbeb',
      '--bg-page':                  '#fffbeb',
      '--bg-surface':               '#ffffff',
      '--text-primary':             '#451a03',
      '--text-secondary':           '#92400e',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // TEMAS OSCUROS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'dark-blue',
    name: 'Dark Ocean',
    emoji: '🌊',
    description: 'Azul marino profundo — oscuro y elegante',
    isDark: true,
    colorPrimary: '#3b82f6',
    preview: ['#0f172a', '#3b82f6', '#1e293b'],
    vars: {
      '--brand-primary':            '#3b82f6',
      '--brand-primary-light':      '#1e3a5f',
      '--sidebar-bg':               '#0f172a',
      '--sidebar-fg':               '#e2e8f0',
      '--sidebar-muted':            '#64748b',
      '--sidebar-border':           '#1e293b',
      '--sidebar-item-active-bg':   '#1e3a5f',
      '--sidebar-item-active-color':'#60a5fa',
      '--sidebar-item-hover-bg':    '#1e293b',
      '--bg-page':                  '#0f172a',
      '--bg-surface':               '#1e293b',
      '--text-primary':             '#f1f5f9',
      '--text-secondary':           '#94a3b8',
    },
  },

  {
    id: 'dark-green',
    name: 'Dark Forest',
    emoji: '🌲',
    description: 'Verde bosque oscuro — natural y profundo',
    isDark: true,
    colorPrimary: '#10b981',
    preview: ['#0f1f17', '#10b981', '#132d1f'],
    vars: {
      '--brand-primary':            '#10b981',
      '--brand-primary-light':      '#064e3b',
      '--sidebar-bg':               '#0f1f17',
      '--sidebar-fg':               '#d1fae5',
      '--sidebar-muted':            '#4ade80',
      '--sidebar-border':           '#132d1f',
      '--sidebar-item-active-bg':   '#064e3b',
      '--sidebar-item-active-color':'#34d399',
      '--sidebar-item-hover-bg':    '#132d1f',
      '--bg-page':                  '#0f1f17',
      '--bg-surface':               '#132d1f',
      '--text-primary':             '#ecfdf5',
      '--text-secondary':           '#6ee7b7',
    },
  },

  {
    id: 'dark-amber',
    name: 'Dark Ember',
    emoji: '🔥',
    description: 'Naranja brasa oscuro — cálido e intenso',
    isDark: true,
    colorPrimary: '#f97316',
    preview: ['#1c1008', '#f97316', '#2a1608'],
    vars: {
      '--brand-primary':            '#f97316',
      '--brand-primary-light':      '#431407',
      '--sidebar-bg':               '#1c1008',
      '--sidebar-fg':               '#fed7aa',
      '--sidebar-muted':            '#c2410c',
      '--sidebar-border':           '#2a1608',
      '--sidebar-item-active-bg':   '#431407',
      '--sidebar-item-active-color':'#fb923c',
      '--sidebar-item-hover-bg':    '#2a1608',
      '--bg-page':                  '#1c1008',
      '--bg-surface':               '#2a1608',
      '--text-primary':             '#fff7ed',
      '--text-secondary':           '#fdba74',
    },
  },

  {
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '⚫',
    description: 'Negro obsidiana con índigo — puro y elegante',
    isDark: true,
    colorPrimary: '#6366f1',
    preview: ['#0f0f0f', '#6366f1', '#18181b'],
    vars: {
      '--brand-primary':            '#6366f1',
      '--brand-primary-light':      '#312e81',
      '--sidebar-bg':               '#0f0f0f',
      '--sidebar-fg':               '#e4e4e7',
      '--sidebar-muted':            '#71717a',
      '--sidebar-border':           '#27272a',
      '--sidebar-item-active-bg':   '#312e81',
      '--sidebar-item-active-color':'#818cf8',
      '--sidebar-item-hover-bg':    '#27272a',
      '--bg-page':                  '#0f0f0f',
      '--bg-surface':               '#18181b',
      '--text-primary':             '#fafafa',
      '--text-secondary':           '#a1a1aa',
    },
  },

  {
    id: 'dark-violet',
    name: 'Dark Plum',
    emoji: '🍇',
    description: 'Ciruela oscura — sofisticado y premium',
    isDark: true,
    colorPrimary: '#a855f7',
    preview: ['#1a0a2e', '#a855f7', '#240f3f'],
    vars: {
      '--brand-primary':            '#a855f7',
      '--brand-primary-light':      '#4c1d95',
      '--sidebar-bg':               '#1a0a2e',
      '--sidebar-fg':               '#f3e8ff',
      '--sidebar-muted':            '#7c3aed',
      '--sidebar-border':           '#2e1065',
      '--sidebar-item-active-bg':   '#4c1d95',
      '--sidebar-item-active-color':'#c084fc',
      '--sidebar-item-hover-bg':    '#240f3f',
      '--bg-page':                  '#1a0a2e',
      '--bg-surface':               '#240f3f',
      '--text-primary':             '#faf5ff',
      '--text-secondary':           '#d8b4fe',
    },
  },

  {
    id: 'crimson',
    name: 'Dark Crimson',
    emoji: '🩸',
    description: 'Rojo carmesí oscuro — intenso y poderoso',
    isDark: true,
    colorPrimary: '#ef4444',
    preview: ['#0f0505', '#ef4444', '#1f0a0a'],
    vars: {
      '--brand-primary':            '#ef4444',
      '--brand-primary-light':      '#450a0a',
      '--sidebar-bg':               '#0f0505',
      '--sidebar-fg':               '#fecaca',
      '--sidebar-muted':            '#7f1d1d',
      '--sidebar-border':           '#1f0a0a',
      '--sidebar-item-active-bg':   '#450a0a',
      '--sidebar-item-active-color':'#f87171',
      '--sidebar-item-hover-bg':    '#1f0a0a',
      '--bg-page':                  '#0f0505',
      '--bg-surface':               '#1f0a0a',
      '--text-primary':             '#fef2f2',
      '--text-secondary':           '#fca5a5',
    },
  },

  {
    id: 'dark-teal',
    name: 'Dark Abyss',
    emoji: '🌀',
    description: 'Verde azulado profundo — abismal y moderno',
    isDark: true,
    colorPrimary: '#14b8a6',
    preview: ['#051210', '#14b8a6', '#0d2320'],
    vars: {
      '--brand-primary':            '#14b8a6',
      '--brand-primary-light':      '#134e4a',
      '--sidebar-bg':               '#051210',
      '--sidebar-fg':               '#ccfbf1',
      '--sidebar-muted':            '#0f766e',
      '--sidebar-border':           '#0d2320',
      '--sidebar-item-active-bg':   '#134e4a',
      '--sidebar-item-active-color':'#2dd4bf',
      '--sidebar-item-hover-bg':    '#0d2320',
      '--bg-page':                  '#051210',
      '--bg-surface':               '#0d2320',
      '--text-primary':             '#f0fdfa',
      '--text-secondary':           '#5eead4',
    },
  },

  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    description: 'Azul medianoche total — ultra oscuro y elegante',
    isDark: true,
    colorPrimary: '#60a5fa',
    preview: ['#020617', '#60a5fa', '#0f172a'],
    vars: {
      '--brand-primary':            '#60a5fa',
      '--brand-primary-light':      '#1e3a5f',
      '--sidebar-bg':               '#020617',
      '--sidebar-fg':               '#cbd5e1',
      '--sidebar-muted':            '#334155',
      '--sidebar-border':           '#0f172a',
      '--sidebar-item-active-bg':   '#1e3a5f',
      '--sidebar-item-active-color':'#93c5fd',
      '--sidebar-item-hover-bg':    '#0f172a',
      '--bg-page':                  '#020617',
      '--bg-surface':               '#0f172a',
      '--text-primary':             '#f8fafc',
      '--text-secondary':           '#94a3b8',
    },
  },

  {
    id: 'dark-rose',
    name: 'Dark Rose',
    emoji: '🌹',
    description: 'Rosa oscuro — cálido y sofisticado',
    isDark: true,
    colorPrimary: '#f472b6',
    preview: ['#1a0512', '#f472b6', '#2d0a1f'],
    vars: {
      '--brand-primary':            '#f472b6',
      '--brand-primary-light':      '#500724',
      '--sidebar-bg':               '#1a0512',
      '--sidebar-fg':               '#fce7f3',
      '--sidebar-muted':            '#9d174d',
      '--sidebar-border':           '#2d0a1f',
      '--sidebar-item-active-bg':   '#500724',
      '--sidebar-item-active-color':'#f9a8d4',
      '--sidebar-item-hover-bg':    '#2d0a1f',
      '--bg-page':                  '#1a0512',
      '--bg-surface':               '#2d0a1f',
      '--text-primary':             '#fdf2f8',
      '--text-secondary':           '#fbcfe8',
    },
  },

  {
    id: 'dark-gold',
    name: 'Dark Gold',
    emoji: '🏆',
    description: 'Dorado oscuro — lujoso y premium',
    isDark: true,
    colorPrimary: '#eab308',
    preview: ['#1a1500', '#eab308', '#2a2200'],
    vars: {
      '--brand-primary':            '#eab308',
      '--brand-primary-light':      '#422006',
      '--sidebar-bg':               '#1a1500',
      '--sidebar-fg':               '#fef9c3',
      '--sidebar-muted':            '#854d0e',
      '--sidebar-border':           '#2a2200',
      '--sidebar-item-active-bg':   '#422006',
      '--sidebar-item-active-color':'#facc15',
      '--sidebar-item-hover-bg':    '#2a2200',
      '--bg-page':                  '#1a1500',
      '--bg-surface':               '#2a2200',
      '--text-primary':             '#fefce8',
      '--text-secondary':           '#fde047',
    },
  },
]

// ─── Agrupados por modo ───────────────────────────────────────────────────────
export const THEMES_LIGHT: PolarisTheme[] = POLARIS_THEMES.filter(t => !t.isDark)
export const THEMES_DARK:  PolarisTheme[] = POLARIS_THEMES.filter(t =>  t.isDark)
