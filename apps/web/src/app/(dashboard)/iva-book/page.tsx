'use client'
import { useState } from 'react'
import {
  Card, Button, Row, Col, Typography, Space, Select, Spin, Alert, DatePicker, Divider, Tag,
} from 'antd'
import {
  FileTextOutlined, ShoppingOutlined, ShoppingCartOutlined, ReloadOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import { abrirLibroIvaVentasHtml, abrirLibroIvaComprasHtml } from '../../../lib/doc-viewer'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default function IvaBookPage() {
  const { companyId } = useAppContext()
  const now = dayjs()
  const [month, setMonth] = useState<number>(now.month() + 1)
  const [year,  setYear]  = useState<number>(now.year())

  const params = { companyId: companyId!, month: String(month), year: String(year) }

  const ventasQ = useQuery({
    queryKey: ['iva-ventas', companyId, month, year],
    queryFn:  () => api.get('/api/reports/iva-ventas', { params }).then(r => r.data),
    enabled:  false,
  })

  const comprasQ = useQuery({
    queryKey: ['iva-compras', companyId, month, year],
    queryFn:  () => api.get('/api/reports/iva-compras', { params }).then(r => r.data),
    enabled:  false,
  })

  const periodo = `${MESES[month - 1]} ${year}`

  const verVentas = async () => {
    const result = await ventasQ.refetch()
    if (result.data) abrirLibroIvaVentasHtml(result.data)
  }

  const verCompras = async () => {
    const result = await comprasQ.refetch()
    if (result.data) abrirLibroIvaComprasHtml(result.data)
  }

  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
    const y = now.year() - i
    return { value: y, label: String(y) }
  })

  const MONTH_OPTIONS = MESES.map((m, i) => ({ value: i + 1, label: m }))

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Libros de IVA</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Libro de Ventas y Compras — F-07 Ministerio de Hacienda El Salvador
        </Text>
      </div>

      <Alert
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        message="Documentos legales F-07"
        description={
          <Text style={{ fontSize: 12 }}>
            Los libros se generan desde los documentos DTE aceptados (ventas) y órdenes de compra recibidas.
            Para el Libro de Compras, registre el N° CCF del proveedor y el desglose IVA al crear la orden.
            Genere el PDF usando la opción &quot;Imprimir / Guardar PDF&quot; del navegador.
          </Text>
        }
        style={{ marginBottom: 20, borderRadius: 10 }}
      />

      {/* Selector de período */}
      <Card
        size="small"
        title={<Space><FileTextOutlined /><Text strong>Seleccionar período</Text></Space>}
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 20 }}
      >
        <Space wrap>
          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Mes</Text>
            <Select
              value={month}
              onChange={setMonth}
              options={MONTH_OPTIONS}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Año</Text>
            <Select
              value={year}
              onChange={setYear}
              options={YEAR_OPTIONS}
              style={{ width: 110 }}
            />
          </div>
          <div style={{ marginTop: 20 }}>
            <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, padding: '4px 12px' }}>
              {periodo}
            </Tag>
          </div>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Libro de Ventas */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{
              borderRadius: 14, border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
              borderTop: '4px solid #1a365d',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ShoppingCartOutlined style={{ fontSize: 22, color: '#1a365d' }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 15 }}>Libro de Ventas</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Sección I (CCF/NC/ND) + Sección II (CF)</Text>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Fuente</Text>
                <Text>DTE aceptados (Hacienda)</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Sección I</Text>
                <Text>CCF, NC, ND a contribuyentes</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Sección II</Text>
                <Text>CF a consumidores finales</Text>
              </div>
            </div>

            {ventasQ.isError && (
              <Alert type="error" message="Error al cargar datos de ventas" style={{ marginBottom: 12, borderRadius: 8 }} />
            )}

            <Button
              type="primary"
              icon={ventasQ.isFetching ? <Spin size="small" /> : <FileTextOutlined />}
              onClick={verVentas}
              loading={ventasQ.isFetching}
              disabled={!companyId}
              block
              style={{ borderRadius: 8, fontWeight: 600, height: 40 }}
            >
              Ver Libro de Ventas — {periodo}
            </Button>

            {ventasQ.data && !ventasQ.isFetching && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#dcfce7', borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>
                  Seccion I: {ventasQ.data.contribuyentes?.length ?? 0} docs ·
                  Sección II: {ventasQ.data.consumidores?.length ?? 0} docs
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Libro de Compras */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            style={{
              borderRadius: 14, border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
              borderTop: '4px solid #2563eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ShoppingOutlined style={{ fontSize: 22, color: '#2563eb' }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 15 }}>Libro de Compras</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Sección III — CCF recibidos de proveedores</Text>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Fuente</Text>
                <Text>Órdenes de compra recibidas</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Requerido</Text>
                <Text>N° CCF proveedor + desglose IVA</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Campos</Text>
                <Text>Gravadas, IVA 13%, Ret. 1%</Text>
              </div>
            </div>

            {comprasQ.isError && (
              <Alert type="error" message="Error al cargar datos de compras" style={{ marginBottom: 12, borderRadius: 8 }} />
            )}

            <Button
              icon={comprasQ.isFetching ? <Spin size="small" /> : <FileTextOutlined />}
              onClick={verCompras}
              loading={comprasQ.isFetching}
              disabled={!companyId}
              block
              style={{ borderRadius: 8, fontWeight: 600, height: 40, borderColor: '#2563eb', color: '#2563eb' }}
            >
              Ver Libro de Compras — {periodo}
            </Button>

            {comprasQ.data && !comprasQ.isFetching && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#dcfce7', borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>
                  {comprasQ.data.compras?.length ?? 0} órdenes de compra encontradas
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Instrucciones */}
      <Divider style={{ margin: '24px 0 16px' }} />
      <Card
        size="small"
        title={<Space><InfoCircleOutlined /><Text strong style={{ fontSize: 13 }}>Cómo completar el Libro de Compras</Text></Space>}
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Row gutter={[16, 16]}>
          {[
            { n: '1', title: 'Al crear la orden de compra', desc: 'Ingrese el N° de CCF del proveedor en el campo "N° Documento Proveedor".' },
            { n: '2', title: 'Desglose IVA', desc: 'Complete los campos: Ventas Gravadas, IVA 13% (crédito fiscal), Exentas, No Sujetas.' },
            { n: '3', title: 'Recibir la orden', desc: 'Cambie el estado a "Recibido" para que aparezca en el Libro de Compras.' },
            { n: '4', title: 'Generar el libro', desc: 'Seleccione el período y presione "Ver Libro de Compras". Use Imprimir/PDF del navegador.' },
          ].map(step => (
            <Col xs={24} sm={12} key={step.n}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#1a365d',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {step.n}
                </div>
                <div>
                  <Text strong style={{ fontSize: 12 }}>{step.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{step.desc}</Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
