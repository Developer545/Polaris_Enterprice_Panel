'use client'
import { useEffect, useState } from 'react'
import { Card, Tag, Button, Statistic, Skeleton, Alert, Typography, Space, Divider } from 'antd'
import {
  DesktopOutlined, DownloadOutlined, LinkOutlined,
  CalendarOutlined, CheckCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { App } from 'antd'

const { Title, Text, Paragraph } = Typography

const REPO = 'Developer545/polaris-releases'
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`
const DOWNLOAD_BASE = `https://github.com/${REPO}/releases/latest/download`

interface GithubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  assets: { name: string; size: number; download_count: number; browser_download_url: string }[]
}

function formatBytes(bytes: number) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-SV', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function ReleasesPage() {
  const { message } = App.useApp()
  const [release, setRelease] = useState<GithubRelease | null>(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(GITHUB_API, { cache: 'no-store' })
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      setRelease(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar GitHub')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function copyLink() {
    const url = `${DOWNLOAD_BASE}/Polaris-Setup-${release?.tag_name?.replace('v', '')}.exe`
    navigator.clipboard.writeText(url)
    message.success('Link copiado al portapapeles')
  }

  const exe = release?.assets.find((a) => a.name.endsWith('.exe'))

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #f47920, #ff6b00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DesktopOutlined style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Versión Desktop</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Polaris — App de escritorio Windows</Text>
          </div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="small">
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          message="No se pudo obtener información del release"
          description={error}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : release ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Card size="small" style={{ flex: 1, borderRadius: 10 }}>
              <Statistic
                title="Versión publicada"
                value={release.tag_name}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: 22 }}
              />
            </Card>
            <Card size="small" style={{ flex: 1, borderRadius: 10 }}>
              <Statistic
                title="Fecha de publicación"
                value={formatDate(release.published_at)}
                prefix={<CalendarOutlined />}
                valueStyle={{ fontSize: 15 }}
              />
            </Card>
            {exe && (
              <Card size="small" style={{ flex: 1, borderRadius: 10 }}>
                <Statistic
                  title="Tamaño del instalador"
                  value={formatBytes(exe.size)}
                  prefix={<DownloadOutlined />}
                  valueStyle={{ fontSize: 18 }}
                />
              </Card>
            )}
            {exe && (
              <Card size="small" style={{ flex: 1, borderRadius: 10 }}>
                <Statistic
                  title="Descargas totales"
                  value={exe.download_count}
                  prefix={<DownloadOutlined />}
                  valueStyle={{ fontSize: 18 }}
                />
              </Card>
            )}
          </div>

          {/* Download card */}
          <Card
            size="small"
            style={{ borderRadius: 10, border: '1px solid #f47920' }}
            title={
              <span style={{ color: '#f47920', fontWeight: 600 }}>
                <DownloadOutlined style={{ marginRight: 8 }} />
                Instalador Windows
              </span>
            }
            extra={<Tag color="orange">{release.tag_name}</Tag>}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text strong style={{ fontFamily: 'monospace' }}>
                  Polaris-Setup-{release.tag_name.replace('v', '')}.exe
                </Text>
                {exe && (
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    {formatBytes(exe.size)} · Windows x64
                  </Text>
                )}
              </div>
              <Space>
                <Button
                  icon={<LinkOutlined />}
                  onClick={copyLink}
                >
                  Copiar link
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  href={`${DOWNLOAD_BASE}/Polaris-Setup-${release.tag_name.replace('v', '')}.exe`}
                  target="_blank"
                  style={{ background: '#f47920', borderColor: '#f47920' }}
                >
                  Descargar
                </Button>
              </Space>
            </div>
          </Card>

          {/* Release notes */}
          {release.body && (
            <Card
              size="small"
              style={{ borderRadius: 10 }}
              title="Notas de la versión"
              extra={
                <Button
                  type="link"
                  size="small"
                  href={release.html_url}
                  target="_blank"
                  icon={<LinkOutlined />}
                >
                  Ver en GitHub
                </Button>
              }
            >
              <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>
                {release.body}
              </Paragraph>
            </Card>
          )}

          {/* All assets */}
          <Card size="small" style={{ borderRadius: 10 }} title="Todos los archivos">
            {release.assets.map((asset) => (
              <div key={asset.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid #f0f0f0',
              }}>
                <div>
                  <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{asset.name}</Text>
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    {formatBytes(asset.size)}
                  </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {asset.download_count} descargas
                  </Text>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    href={asset.browser_download_url}
                    target="_blank"
                  >
                    Descargar
                  </Button>
                </div>
              </div>
            ))}
          </Card>

        </Space>
      ) : null}
    </div>
  )
}
