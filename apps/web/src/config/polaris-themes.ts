/**
 * Sistema de temas visual para Polaris Enterprise ERP/POS.
 * Usa variables CSS con valores hex completos para máxima claridad.
 * Se aplican con document.documentElement.style.setProperty()
 *
 * 5 temas claros + 5 temas oscuros = 10 en total.
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
]

// ─── Agrupados por modo ───────────────────────────────────────────────────────
export const THEMES_LIGHT: PolarisTheme[] = POLARIS_THEMES.filter(t => !t.isDark)
export const THEMES_DARK:  PolarisTheme[] = POLARIS_THEMES.filter(t =>  t.isDark)
