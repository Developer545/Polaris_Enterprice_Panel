import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../providers'

export const metadata: Metadata = {
  title: 'Polaris Enterprise',
  description: 'ERP · POS · Facturación electrónica DTE — El Salvador',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011'
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: applies theme CSS vars before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var STORAGE_KEY='polaris-theme-id';
  var DEFAULT='polaris-blue';
  var themes={
    'polaris-blue':{'--brand-primary':'#2563eb','--brand-primary-light':'#dbeafe','--sidebar-bg':'#f8f9fc','--sidebar-fg':'#1e293b','--sidebar-muted':'#94a3b8','--sidebar-border':'#e2e8f0','--sidebar-item-active-bg':'#dbeafe','--sidebar-item-active-color':'#2563eb','--sidebar-item-hover-bg':'#f1f5f9','--bg-page':'#f1f5f9','--bg-surface':'#ffffff','--text-primary':'#1e293b','--text-secondary':'#64748b'},
    'emerald':{'--brand-primary':'#059669','--brand-primary-light':'#d1fae5','--sidebar-bg':'#f5fbf8','--sidebar-fg':'#064e3b','--sidebar-muted':'#6ee7b7','--sidebar-border':'#a7f3d0','--sidebar-item-active-bg':'#d1fae5','--sidebar-item-active-color':'#059669','--sidebar-item-hover-bg':'#ecfdf5','--bg-page':'#f0faf5','--bg-surface':'#ffffff','--text-primary':'#064e3b','--text-secondary':'#047857'},
    'amber':{'--brand-primary':'#f47920','--brand-primary-light':'#fed7aa','--sidebar-bg':'#fdf8f4','--sidebar-fg':'#431407','--sidebar-muted':'#c2410c','--sidebar-border':'#fed7aa','--sidebar-item-active-bg':'#ffedd5','--sidebar-item-active-color':'#ea580c','--sidebar-item-hover-bg':'#fff7ed','--bg-page':'#fef3e8','--bg-surface':'#ffffff','--text-primary':'#431407','--text-secondary':'#9a3412'},
    'slate':{'--brand-primary':'#475569','--brand-primary-light':'#e2e8f0','--sidebar-bg':'#f8fafc','--sidebar-fg':'#0f172a','--sidebar-muted':'#94a3b8','--sidebar-border':'#cbd5e1','--sidebar-item-active-bg':'#e2e8f0','--sidebar-item-active-color':'#334155','--sidebar-item-hover-bg':'#f1f5f9','--bg-page':'#f1f5f9','--bg-surface':'#ffffff','--text-primary':'#0f172a','--text-secondary':'#475569'},
    'violet':{'--brand-primary':'#7c3aed','--brand-primary-light':'#ede9fe','--sidebar-bg':'#faf5ff','--sidebar-fg':'#2e1065','--sidebar-muted':'#a78bfa','--sidebar-border':'#ddd6fe','--sidebar-item-active-bg':'#ede9fe','--sidebar-item-active-color':'#7c3aed','--sidebar-item-hover-bg':'#f5f3ff','--bg-page':'#f5f3ff','--bg-surface':'#ffffff','--text-primary':'#2e1065','--text-secondary':'#6d28d9'},
    'rose':{'--brand-primary':'#e11d48','--brand-primary-light':'#ffe4e6','--sidebar-bg':'#fff5f7','--sidebar-fg':'#4c0519','--sidebar-muted':'#fb7185','--sidebar-border':'#fecdd3','--sidebar-item-active-bg':'#ffe4e6','--sidebar-item-active-color':'#e11d48','--sidebar-item-hover-bg':'#fff1f2','--bg-page':'#fff1f2','--bg-surface':'#ffffff','--text-primary':'#4c0519','--text-secondary':'#be123c'},
    'teal':{'--brand-primary':'#0d9488','--brand-primary-light':'#ccfbf1','--sidebar-bg':'#f0fdfa','--sidebar-fg':'#134e4a','--sidebar-muted':'#5eead4','--sidebar-border':'#99f6e4','--sidebar-item-active-bg':'#ccfbf1','--sidebar-item-active-color':'#0d9488','--sidebar-item-hover-bg':'#f0fdfa','--bg-page':'#f0fdfa','--bg-surface':'#ffffff','--text-primary':'#134e4a','--text-secondary':'#0f766e'},
    'sky':{'--brand-primary':'#0284c7','--brand-primary-light':'#e0f2fe','--sidebar-bg':'#f0f9ff','--sidebar-fg':'#0c4a6e','--sidebar-muted':'#7dd3fc','--sidebar-border':'#bae6fd','--sidebar-item-active-bg':'#e0f2fe','--sidebar-item-active-color':'#0284c7','--sidebar-item-hover-bg':'#f0f9ff','--bg-page':'#f0f9ff','--bg-surface':'#ffffff','--text-primary':'#0c4a6e','--text-secondary':'#0369a1'},
    'gold':{'--brand-primary':'#d97706','--brand-primary-light':'#fef3c7','--sidebar-bg':'#fffbeb','--sidebar-fg':'#451a03','--sidebar-muted':'#fcd34d','--sidebar-border':'#fde68a','--sidebar-item-active-bg':'#fef3c7','--sidebar-item-active-color':'#d97706','--sidebar-item-hover-bg':'#fffbeb','--bg-page':'#fffbeb','--bg-surface':'#ffffff','--text-primary':'#451a03','--text-secondary':'#92400e'},
    'dark-blue':{'--brand-primary':'#3b82f6','--brand-primary-light':'#1e3a5f','--sidebar-bg':'#0f172a','--sidebar-fg':'#e2e8f0','--sidebar-muted':'#64748b','--sidebar-border':'#1e293b','--sidebar-item-active-bg':'#1e3a5f','--sidebar-item-active-color':'#60a5fa','--sidebar-item-hover-bg':'#1e293b','--bg-page':'#0f172a','--bg-surface':'#1e293b','--text-primary':'#f1f5f9','--text-secondary':'#94a3b8'},
    'dark-green':{'--brand-primary':'#10b981','--brand-primary-light':'#064e3b','--sidebar-bg':'#0f1f17','--sidebar-fg':'#d1fae5','--sidebar-muted':'#4ade80','--sidebar-border':'#132d1f','--sidebar-item-active-bg':'#064e3b','--sidebar-item-active-color':'#34d399','--sidebar-item-hover-bg':'#132d1f','--bg-page':'#0f1f17','--bg-surface':'#132d1f','--text-primary':'#ecfdf5','--text-secondary':'#6ee7b7'},
    'dark-amber':{'--brand-primary':'#f97316','--brand-primary-light':'#431407','--sidebar-bg':'#1c1008','--sidebar-fg':'#fed7aa','--sidebar-muted':'#c2410c','--sidebar-border':'#2a1608','--sidebar-item-active-bg':'#431407','--sidebar-item-active-color':'#fb923c','--sidebar-item-hover-bg':'#2a1608','--bg-page':'#1c1008','--bg-surface':'#2a1608','--text-primary':'#fff7ed','--text-secondary':'#fdba74'},
    'obsidian':{'--brand-primary':'#6366f1','--brand-primary-light':'#312e81','--sidebar-bg':'#0f0f0f','--sidebar-fg':'#e4e4e7','--sidebar-muted':'#71717a','--sidebar-border':'#27272a','--sidebar-item-active-bg':'#312e81','--sidebar-item-active-color':'#818cf8','--sidebar-item-hover-bg':'#27272a','--bg-page':'#0f0f0f','--bg-surface':'#18181b','--text-primary':'#fafafa','--text-secondary':'#a1a1aa'},
    'dark-violet':{'--brand-primary':'#a855f7','--brand-primary-light':'#4c1d95','--sidebar-bg':'#1a0a2e','--sidebar-fg':'#f3e8ff','--sidebar-muted':'#7c3aed','--sidebar-border':'#2e1065','--sidebar-item-active-bg':'#4c1d95','--sidebar-item-active-color':'#c084fc','--sidebar-item-hover-bg':'#240f3f','--bg-page':'#1a0a2e','--bg-surface':'#240f3f','--text-primary':'#faf5ff','--text-secondary':'#d8b4fe'},
    'crimson':{'--brand-primary':'#ef4444','--brand-primary-light':'#450a0a','--sidebar-bg':'#0f0505','--sidebar-fg':'#fecaca','--sidebar-muted':'#7f1d1d','--sidebar-border':'#1f0a0a','--sidebar-item-active-bg':'#450a0a','--sidebar-item-active-color':'#f87171','--sidebar-item-hover-bg':'#1f0a0a','--bg-page':'#0f0505','--bg-surface':'#1f0a0a','--text-primary':'#fef2f2','--text-secondary':'#fca5a5'},
    'dark-teal':{'--brand-primary':'#14b8a6','--brand-primary-light':'#134e4a','--sidebar-bg':'#051210','--sidebar-fg':'#ccfbf1','--sidebar-muted':'#0f766e','--sidebar-border':'#0d2320','--sidebar-item-active-bg':'#134e4a','--sidebar-item-active-color':'#2dd4bf','--sidebar-item-hover-bg':'#0d2320','--bg-page':'#051210','--bg-surface':'#0d2320','--text-primary':'#f0fdfa','--text-secondary':'#5eead4'},
    'midnight':{'--brand-primary':'#60a5fa','--brand-primary-light':'#1e3a5f','--sidebar-bg':'#020617','--sidebar-fg':'#cbd5e1','--sidebar-muted':'#334155','--sidebar-border':'#0f172a','--sidebar-item-active-bg':'#1e3a5f','--sidebar-item-active-color':'#93c5fd','--sidebar-item-hover-bg':'#0f172a','--bg-page':'#020617','--bg-surface':'#0f172a','--text-primary':'#f8fafc','--text-secondary':'#94a3b8'},
    'dark-rose':{'--brand-primary':'#f472b6','--brand-primary-light':'#500724','--sidebar-bg':'#1a0512','--sidebar-fg':'#fce7f3','--sidebar-muted':'#9d174d','--sidebar-border':'#2d0a1f','--sidebar-item-active-bg':'#500724','--sidebar-item-active-color':'#f9a8d4','--sidebar-item-hover-bg':'#2d0a1f','--bg-page':'#1a0512','--bg-surface':'#2d0a1f','--text-primary':'#fdf2f8','--text-secondary':'#fbcfe8'},
    'dark-gold':{'--brand-primary':'#eab308','--brand-primary-light':'#422006','--sidebar-bg':'#1a1500','--sidebar-fg':'#fef9c3','--sidebar-muted':'#854d0e','--sidebar-border':'#2a2200','--sidebar-item-active-bg':'#422006','--sidebar-item-active-color':'#facc15','--sidebar-item-hover-bg':'#2a2200','--bg-page':'#1a1500','--bg-surface':'#2a2200','--text-primary':'#fefce8','--text-secondary':'#fde047'}
  };
  try{
    var id=localStorage.getItem(STORAGE_KEY)||DEFAULT;
    var vars=themes[id]||themes[DEFAULT];
    var root=document.documentElement;
    for(var k in vars){root.style.setProperty(k,vars[k]);}
    root.setAttribute('data-theme',id);
  }catch(e){}
})();`,
          }}
        />
        {/* Runtime API URL */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__API_URL__ = window.__API_URL__ || ${JSON.stringify(apiUrl)};`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
