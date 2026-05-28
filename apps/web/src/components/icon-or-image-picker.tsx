'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Button, Modal, Input, Spin, Empty, Tooltip, Progress,
  Segmented, Avatar, theme, App,
} from 'antd'
import {
  SmileOutlined, PictureOutlined, UploadOutlined,
  AppstoreOutlined, ReloadOutlined, SearchOutlined, CloseOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { api } from '../lib/api'

// Emoji-mart se carga solo en cliente — usa ~900KB de datos
const EmojiMartPicker = dynamic(() => import('@emoji-mart/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 435, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin />
    </div>
  ),
})

// emoji-mart data (JSON estático, importado una vez)
import emojiData from '@emoji-mart/data'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resuelve URL de imagen local (Electron Local) a URL HTTP. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('local-image:')) {
    const filename = url.replace('local-image:', '')
    const apiBase  = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
      .replace(/\/api\/?$/, '') // quita el sufijo /api si lo trae
    return `${apiBase}/local-images/${filename}`
  }
  return url
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface GalleryItem {
  publicId:  string
  url:       string
  fullUrl:   string
  bytes:     number
  folder:    string
  createdAt: string
}

interface Props {
  emoji?:    string | null
  imageUrl?: string | null
  onChange:  (update: { emoji: string | null; imageUrl: string | null }) => void
  folder?:   string
}

// ── Componente ────────────────────────────────────────────────────────────────

export function IconOrImagePicker({
  emoji,
  imageUrl,
  onChange,
  folder = 'polaris/productos',
}: Props) {
  const { token }    = theme.useToken()
  const { message }  = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modo activo: 'emoji' | 'image'
  const [mode, setMode] = useState<'emoji' | 'image'>(imageUrl ? 'image' : 'emoji')

  // Sincroniza modo cuando el form carga un registro existente
  useEffect(() => {
    if (imageUrl) setMode('image')
    else if (!imageUrl && emoji) setMode('emoji')
  }, [imageUrl, emoji])

  // ── Emoji modal ──────────────────────────────────────────────────────────
  const [emojiModalOpen, setEmojiModalOpen] = useState(false)

  function handleEmojiSelect(emojiData: any) {
    onChange({ emoji: emojiData.native as string, imageUrl: null })
    setEmojiModalOpen(false)
  }

  // ── Image upload ─────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)

  async function handleFileUpload(file: File) {
    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      message.error('Solo PNG, JPG, SVG o WebP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('La imagen no puede superar 10 MB')
      return
    }

    setUploading(true)
    setProgress(15)
    try {
      const data = await toBase64(file)
      setProgress(40)

      const res = await api.post<{ imageUrl: string }>('/api/upload/image', {
        data,
        filename: file.name,
        mimeType: file.type,
        folder,
      })
      setProgress(100)
      onChange({ emoji: null, imageUrl: res.data.imageUrl })
      message.success('Imagen subida correctamente')
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error subiendo imagen')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Gallery picker ────────────────────────────────────────────────────────
  const [galleryOpen,    setGalleryOpen]    = useState(false)
  const [galleryImages,  setGalleryImages]  = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [search,         setSearch]         = useState('')

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const res = await api.get<{ data: GalleryItem[] }>('/api/upload/gallery', {
        params: { folder: folder.split('/')[0] },
      })
      setGalleryImages(res.data.data ?? [])
    } catch {
      message.error('Error cargando galería')
    } finally {
      setGalleryLoading(false)
    }
  }, [folder, message])

  function openGallery() {
    setGalleryOpen(true)
    setSearch('')
    loadGallery()
  }

  function selectFromGallery(item: GalleryItem) {
    onChange({ emoji: null, imageUrl: item.fullUrl })
    setGalleryOpen(false)
    message.success('Imagen seleccionada')
  }

  const filteredGallery = search
    ? galleryImages.filter(i =>
        i.publicId.toLowerCase().includes(search.toLowerCase()),
      )
    : galleryImages

  // ── Switch de modo ────────────────────────────────────────────────────────
  function handleModeChange(newMode: 'emoji' | 'image') {
    setMode(newMode)
    // Limpiar el tipo opuesto
    if (newMode === 'emoji') onChange({ emoji: emoji ?? null, imageUrl: null })
    else                     onChange({ emoji: null, imageUrl: imageUrl ?? null })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const resolvedImage = resolveImageUrl(imageUrl)

  return (
    <>
      {/* Toggle */}
      <Segmented
        size="small"
        value={mode}
        onChange={v => handleModeChange(v as 'emoji' | 'image')}
        options={[
          { value: 'emoji', icon: <SmileOutlined />, label: 'Emoji' },
          { value: 'image', icon: <PictureOutlined />, label: 'Imagen' },
        ]}
        style={{ marginBottom: 10 }}
      />

      {/* ── Modo Emoji ── */}
      {mode === 'emoji' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Preview */}
          <div
            onClick={() => setEmojiModalOpen(true)}
            style={{
              width: 48, height: 48, borderRadius: 10, cursor: 'pointer',
              border: `1px dashed ${token.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: emoji ? 28 : 18,
              background: token.colorFillAlter,
              transition: 'border-color 0.2s',
            }}
            title="Cambiar emoji"
          >
            {emoji || <SmileOutlined style={{ color: token.colorTextQuaternary }} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Button size="small" icon={<AppstoreOutlined />} onClick={() => setEmojiModalOpen(true)}>
              {emoji ? 'Cambiar' : 'Elegir emoji'}
            </Button>
            {emoji && (
              <Button
                size="small" danger icon={<CloseOutlined />}
                onClick={() => onChange({ emoji: null, imageUrl: null })}
              >
                Quitar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Modo Imagen ── */}
      {mode === 'image' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {/* Preview o drop zone */}
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && !resolvedImage && fileInputRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 10, flexShrink: 0,
              border: resolvedImage ? 'none' : `2px dashed ${token.colorBorder}`,
              overflow: 'hidden', cursor: resolvedImage ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: token.colorFillAlter,
            }}
          >
            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt="preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              uploading
                ? <Spin size="small" />
                : <PictureOutlined style={{ fontSize: 24, color: token.colorTextQuaternary }} />
            )}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Button
              size="small" icon={<UploadOutlined />}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {resolvedImage ? 'Cambiar' : 'Subir foto'}
            </Button>
            <Button size="small" icon={<AppstoreOutlined />} onClick={openGallery}>
              Galería
            </Button>
            {resolvedImage && (
              <Button
                size="small" danger icon={<CloseOutlined />}
                onClick={() => onChange({ emoji: null, imageUrl: null })}
              >
                Quitar
              </Button>
            )}
          </div>

          {uploading && (
            <Progress
              percent={progress} size="small" status="active"
              style={{ width: 100, marginTop: 26 }}
            />
          )}
        </div>
      )}

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.webp"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
      />

      {/* ── Modal emoji-mart ── */}
      <Modal
        open={emojiModalOpen}
        onCancel={() => setEmojiModalOpen(false)}
        footer={null}
        width={380}
        title={<span><SmileOutlined style={{ marginRight: 8 }} />Seleccionar emoji</span>}
        styles={{ body: { padding: '8px 0 0' } }}
        destroyOnClose
      >
        <EmojiMartPicker
          data={emojiData}
          onEmojiSelect={handleEmojiSelect}
          locale="es"
          theme={token.colorBgBase === '#ffffff' ? 'light' : 'dark'}
          previewPosition="none"
          skinTonePosition="none"
          style={{ width: '100%', border: 'none' }}
        />
      </Modal>

      {/* ── Modal galería ── */}
      <Modal
        open={galleryOpen}
        onCancel={() => setGalleryOpen(false)}
        footer={null}
        width={820}
        title={<span><PictureOutlined style={{ marginRight: 8 }} />Galería de imágenes</span>}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ flex: 1 }}
          />
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={loadGallery} loading={galleryLoading} />
          </Tooltip>
        </div>

        <Spin spinning={galleryLoading}>
          {filteredGallery.length === 0 && !galleryLoading ? (
            <Empty description="No hay imágenes. Sube la primera desde el campo de arriba." />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}>
              {filteredGallery.map(img => {
                const displayUrl = resolveImageUrl(img.url) ?? img.url
                return (
                  <div
                    key={img.publicId}
                    onClick={() => selectFromGallery(img)}
                    style={{
                      cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                      border: `2px solid transparent`,
                      transition: 'border-color 0.15s, transform 0.15s',
                      background: token.colorFillAlter,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = token.colorPrimary
                      ;(e.currentTarget as HTMLDivElement).style.transform  = 'scale(1.02)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
                      ;(e.currentTarget as HTMLDivElement).style.transform  = 'scale(1)'
                    }}
                  >
                    <img
                      src={displayUrl}
                      alt={img.publicId}
                      style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                    <div style={{ padding: '4px 8px' }}>
                      <div style={{
                        fontSize: 10, color: token.colorTextSecondary,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {img.publicId.split('/').pop()}
                      </div>
                      {img.bytes > 0 && (
                        <div style={{ fontSize: 10, color: token.colorTextQuaternary }}>
                          {Math.round(img.bytes / 1024)} KB
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Spin>
      </Modal>
    </>
  )
}
