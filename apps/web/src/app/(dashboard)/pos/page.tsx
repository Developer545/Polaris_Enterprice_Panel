'use client'
import { useState, useEffect, useDeferredValue } from 'react'
import {
  Row, Col, Input, Button, Table, Select, Typography, Divider, Tag, Card,
  InputNumber, Modal, Form, Space, App, Empty, Spin, Badge, Segmented, Avatar, theme,
} from 'antd'
import {
  SearchOutlined, PlusOutlined, DeleteOutlined,
  ShoppingCartOutlined, UserOutlined, DollarOutlined,
  TeamOutlined, UserAddOutlined, IdcardOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import { isElectron } from '../../../lib/is-electron'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  discount: number
  tipoItem: string
  uniMedida: number
  trackStock: boolean
  stock: number
}

const FORMA_PAGO = [
  { value: '01', label: 'Efectivo' },
  { value: '02', label: 'Tarjeta débito' },
  { value: '03', label: 'Tarjeta crédito' },
  { value: '04', label: 'Cheque' },
  { value: '05', label: 'Transferencia bancaria' },
  { value: '06', label: 'Vales de canje' },
  { value: '07', label: 'Vale de regalo' },
  { value: '08', label: 'Crédito' },
  { value: '09', label: 'Nota de débito' },
  { value: '10', label: 'Depósito' },
  { value: '11', label: 'Dinero electrónico' },
]

type ClientMode = 'cf' | 'nuevo' | 'registrado'

function calcLine(item: CartItem, tipoDte: '01' | '03') {
  const sub = item.price * item.quantity - item.discount
  if (tipoDte === '03') {
    const iva = sub * 0.13
    return { ventaGravada: sub, ivaItem: iva, total: sub + iva }
  }
  const iva = sub * 13 / 113
  return { ventaGravada: sub, ivaItem: iva, total: sub }
}

export default function PosPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const deferredProductSearch = useDeferredValue(productSearch)

  // Client state
  const [clientMode, setClientMode] = useState<ClientMode>('cf')
  const [clientSearch, setClientSearch] = useState('')
  const deferredClientSearch = useDeferredValue(clientSearch)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')

  const [tipoDte, setTipoDte] = useState<'01' | '03'>('01')
  const [payModal, setPayModal] = useState(false)
  const [payForm] = Form.useForm()
  const [recibidoEfectivo, setRecibidoEfectivo] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { companyId, branchId } = useAppContext()


  const { data: categories = [] } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: products = [], isFetching: searchingProducts } = useQuery({
    queryKey: ['products-search', companyId, deferredProductSearch, selectedCategory],
    queryFn: () => api.get('/api/products', {
      params: { companyId, search: deferredProductSearch || undefined, categoryId: selectedCategory || undefined },
    }).then(r => r.data),
    enabled: !!companyId && (deferredProductSearch.length >= 1 || !!selectedCategory),
    staleTime: 30_000,
  })

  const { data: clientResults = [], isFetching: searchingClients } = useQuery({
    queryKey: ['clients-search', companyId, deferredClientSearch],
    queryFn: () => api.get('/api/clients', { params: { companyId, search: deferredClientSearch } }).then(r => r.data),
    enabled: !!companyId && deferredClientSearch.length >= 2 && clientMode === 'registrado',
    staleTime: 30_000,
  })

  const { data: openRegister } = useQuery({
    queryKey: ['open-register', branchId],
    queryFn: () => api.get(`/api/cash-registers/open/${branchId}`).then(r => r.data),
    enabled: !!branchId,
  })

  // When tipoDte changes to CCF, force registrado mode
  useEffect(() => {
    if (tipoDte === '03' && clientMode === 'cf') {
      setClientMode('registrado')
      setSelectedClient(null)
    }
  }, [tipoDte])

  // F12 drawer + F11 reprint shortcut feedback (Electron only)
  useEffect(() => {
    if (!isElectron) return
    window.electron.drawer.onShortcut((result) => {
      if (result.ok) {
        message.success({ content: 'Cajón abierto (F12)', duration: 2 })
      } else {
        message.error({ content: `Error cajón: ${result.error}`, duration: 4 })
      }
    })
    window.electron.printer.onPrintShortcut((result) => {
      if (result.ok) {
        message.success({ content: 'Ticket reimpreso (F11)', duration: 2 })
      } else {
        message.error({ content: `Error impresión: ${result.error}`, duration: 4 })
      }
    })
  }, [])

  // Create new quick client mutation
  const createClientMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/clients', dto).then(r => r.data),
  })

  const saleMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/pos/sale', values),
    onSuccess: (response, variables) => {
      message.success('Venta registrada')

      // Build receipt payload for F11 reprint (before cart is cleared)
      if (isElectron) {
        const paymentLabel = FORMA_PAGO.find(f => f.value === variables.payments?.[0]?.formaPago)?.label ?? 'Efectivo'
        const saleNumber = response.data?.saleNumber ?? response.data?.id ?? '—'

        const receiptPayload = {
          businessName: user?.company?.name ?? user?.tenant?.name ?? 'POS DTE',
          branchName: user?.branch?.name ?? openRegister?.branch?.name ?? '',
          cashierName: user?.name ?? '',
          saleNumber,
          date: new Date().toLocaleString('es-SV'),
          tipoDte: tipoDte === '03' ? 'CCF' : 'CF',
          items: cart.map(i => ({
            description: i.name,
            qty: i.quantity,
            unitPrice: i.price,
            total: calcLine(i, tipoDte).total,
          })),
          subtotal: totalGravada,
          iva: totalIva,
          total: totalPagar,
          paymentMethod: paymentLabel,
          amountPaid: recibidoEfectivo > 0 ? recibidoEfectivo : undefined,
          change: recibidoEfectivo > 0 ? Math.max(0, recibidoEfectivo - totalPagar) : undefined,
        }

        // Store in main process — enables F11 reprint without re-querying API
        window.electron.printer.setLastReceipt(receiptPayload).catch(() => {})
      }

      // Open cash drawer (Electron only — silent fail if not configured)
      const win = window as any
      if (win.electron?.drawer?.open) win.electron.drawer.open().catch(() => {})

      setCart([])
      resetClient()
      setPayModal(false)
      payForm.resetFields()
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['recent-sales'] })
      qc.invalidateQueries({ queryKey: ['pos-stats'] })
      qc.invalidateQueries({ queryKey: ['cash-register-summary'] })
      qc.invalidateQueries({ queryKey: ['open-register'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al registrar venta'),
  })

  function resetClient() {
    setClientMode('cf')
    setSelectedClient(null)
    setClientSearch('')
    setNewClientName('')
    setNewClientEmail('')
  }

  function addToCart(product: any) {
    setCart(prev => {
      const exists = prev.find(i => i.productId === product.id)
      if (exists) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        discount: 0,
        tipoItem: product.tipoItem,
        uniMedida: product.uniMedida,
        trackStock: product.trackStock,
        stock: product.stock ?? 0,
      }]
    })
    setProductSearch('')
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const lines = cart.map(item => ({ item, ...calcLine(item, tipoDte) }))
  const totalIva = lines.reduce((s, l) => s + l.ivaItem, 0)
  const totalGravada = lines.reduce((s, l) => s + l.ventaGravada, 0)
  const totalPagar = tipoDte === '03' ? totalGravada + totalIva : totalGravada

  async function openPayModal() {
    if (!cart.length) { message.warning('Agrega productos al carrito'); return }
    if (!openRegister) { message.error('No hay caja abierta en esta sucursal'); return }
    if (tipoDte === '03' && !selectedClient) {
      message.error('Crédito Fiscal requiere seleccionar un cliente registrado con NIT/NRC'); return
    }
    payForm.setFieldsValue({ payments: [{ formaPago: '01', amount: totalPagar.toFixed(2) }] })
    setRecibidoEfectivo(0)
    setPayModal(true)
  }

  async function submitSale(values: any) {
    let clientId: string | null = null

    if (clientMode === 'registrado' && selectedClient) {
      clientId = selectedClient.id
    } else if (clientMode === 'nuevo' && newClientName.trim()) {
      try {
        const newClient = await createClientMut.mutateAsync({
          companyId,
          name: newClientName.trim(),
          email: newClientEmail.trim() || undefined,
          esCreditoFiscal: false,
        })
        clientId = newClient.id
      } catch {
        message.error('Error al crear el cliente nuevo'); return
      }
    }
    // clientMode === 'cf' → clientId stays null, backend uses Consumidor Final

    saleMutation.mutate({
      companyId,
      branchId,
      cashRegisterId: openRegister?.id,
      clientId,
      tipoDte,
      condicionOperacion: '1',
      items: cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
        discount: i.discount,
      })),
      payments: values.payments,
      emitDte: true,
    })
  }

  const cartColumns = [
    {
      title: 'Producto', dataIndex: 'name', key: 'name',
      render: (name: string, r: CartItem) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{name}</div>
          {r.trackStock && (
            <Tag color={(r.stock - r.quantity) <= 0 ? 'red' : 'green'} style={{ fontSize: 10, padding: '0 4px' }}>
              Stock: {r.stock}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Precio', key: 'price', width: 80,
      render: (r: CartItem) => <span style={{ color: '#666' }}>${r.price.toFixed(2)}</span>,
    },
    {
      title: 'Cant.', key: 'qty', width: 90,
      render: (r: CartItem) => (
        <InputNumber
          size="small" min={1}
          max={r.trackStock ? r.stock : undefined}
          value={r.quantity}
          onChange={v => updateQty(r.productId, v ?? 1)}
          style={{ width: 72 }}
        />
      ),
    },
    {
      title: 'Total', key: 'total', width: 90,
      render: (r: CartItem) => {
        const { total } = calcLine(r, tipoDte)
        return <span style={{ fontWeight: 600, color: token.colorPrimary }}>${total.toFixed(2)}</span>
      },
    },
    {
      title: '', key: 'del', width: 40,
      render: (r: CartItem) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => removeFromCart(r.productId)} />
      ),
    },
  ]

  // ── Client panel ──────────────────────────────────────────────────────────────

  const modeOptions = [
    { label: <span style={{ fontSize: 12 }}><IdcardOutlined style={{ marginRight: 4 }} />CF</span>, value: 'cf', disabled: tipoDte === '03' },
    { label: <span style={{ fontSize: 12 }}><UserAddOutlined style={{ marginRight: 4 }} />Nuevo</span>, value: 'nuevo' },
    { label: <span style={{ fontSize: 12 }}><TeamOutlined style={{ marginRight: 4 }} />Registrado</span>, value: 'registrado' },
  ]

  function renderClientContent() {
    if (clientMode === 'cf') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
          <Avatar style={{ background: '#8c8c8c', flexShrink: 0 }} size={36} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Consumidor Final</div>
            <div style={{ fontSize: 11, color: '#999' }}>Factura sin cliente específico</div>
          </div>
          <Tag color="default" style={{ marginLeft: 'auto' }}>CF</Tag>
        </div>
      )
    }

    if (clientMode === 'nuevo') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input
            placeholder="Nombre del cliente *"
            prefix={<UserOutlined style={{ color: '#ccc' }} />}
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            size="small"
          />
          <Input
            placeholder="Correo electrónico (opcional)"
            value={newClientEmail}
            onChange={e => setNewClientEmail(e.target.value)}
            size="small"
            type="email"
          />
          {newClientName.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f1f1ef', borderRadius: 6 }}>
              <Avatar style={{ background: token.colorPrimary }} size={28}>
                {newClientName[0]?.toUpperCase()}
              </Avatar>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{newClientName}</div>
                {newClientEmail && <div style={{ color: '#999' }}>{newClientEmail}</div>}
              </div>
              <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 10 }}>Nuevo</Tag>
            </div>
          )}
        </div>
      )
    }

    // registrado
    if (selectedClient) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
          <Avatar style={{ background: selectedClient.esCreditoFiscal ? token.colorInfo : token.colorSuccess, fontWeight: 700 }} size={34}>
            {selectedClient.name?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClient.name}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {selectedClient.numDocumento ?? selectedClient.email ?? '—'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
            {selectedClient.esCreditoFiscal && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>CCF</Tag>}
            <Button size="small" danger type="text" onClick={() => { setSelectedClient(null); setClientSearch('') }}
              style={{ fontSize: 11, height: 20, padding: '0 6px' }}>
              Quitar
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div>
        <Input
          placeholder="Buscar por nombre, DUI, NIT..."
          prefix={<SearchOutlined style={{ color: '#ccc' }} />}
          suffix={searchingClients ? <Spin size="small" /> : null}
          value={clientSearch}
          onChange={e => setClientSearch(e.target.value)}
          size="small"
          allowClear
        />
        {clientSearch.length >= 2 && clientResults.length > 0 && (
          <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
            {(clientResults as any[]).map((c: any) => (
              <div
                key={c.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => { setSelectedClient(c); setClientSearch('') }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar size={26} style={{ background: c.esCreditoFiscal ? token.colorInfo : token.colorSuccess, fontSize: 11, fontWeight: 700 }}>
                  {c.name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.numDocumento && <div style={{ fontSize: 10, color: '#999' }}>{c.numDocumento}</div>}
                </div>
                {c.esCreditoFiscal && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>CCF</Tag>}
              </div>
            ))}
          </div>
        )}
        {clientSearch.length >= 2 && !searchingClients && (clientResults as any[]).length === 0 && (
          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '8px 0' }}>
            Sin resultados. ¿Desea crear un cliente nuevo?
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 112px)', display: 'flex', gap: 16 }}>
      {/* Left: product search + cart */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Select
            value={tipoDte}
            onChange={v => { setTipoDte(v); if (v === '03' && clientMode === 'cf') setClientMode('registrado') }}
            style={{ width: 168 }}
            options={[
              { value: '01', label: <><Tag color="default" style={{ fontSize: 11 }}>01</Tag> Consumidor Final</> },
              { value: '03', label: <><Tag color="blue" style={{ fontSize: 11 }}>03</Tag> Crédito Fiscal</> },
            ]}
          />
          <Input
            placeholder="Buscar producto por nombre, SKU o código de barras..."
            prefix={<SearchOutlined />}
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ flex: 1 }}
            allowClear
            suffix={searchingProducts ? <Spin size="small" /> : null}
          />
        </div>

        {/* Category filter tabs */}
        {(categories as any[]).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <Tag.CheckableTag
              checked={!selectedCategory}
              onChange={() => setSelectedCategory(null)}
              style={{ cursor: 'pointer' }}
            >
              Todos
            </Tag.CheckableTag>
            {(categories as any[]).map((c: any) => (
              <Tag.CheckableTag
                key={c.id}
                checked={selectedCategory === c.id}
                onChange={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                style={{ cursor: 'pointer' }}
              >
                {c.name}
              </Tag.CheckableTag>
            ))}
          </div>
        )}

        {/* Product search results */}
        {productSearch.length >= 1 && products.length > 0 && (
          <Card size="small" style={{ marginBottom: 12, borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>
            {(products as any[]).map((p: any) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 4px', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s',
                }}
                onClick={() => addToCart(p)}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  {p.sku && <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{p.sku}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.trackStock && (
                    <Tag color={(p.stock ?? 0) <= (p.minStock ?? 0) ? 'red' : 'green'} style={{ fontSize: 11 }}>
                      Stock: {p.stock}
                    </Tag>
                  )}
                  <span style={{ fontWeight: 600, color: token.colorPrimary }}>${Number(p.price).toFixed(2)}</span>
                  <Button type="primary" size="small" icon={<PlusOutlined />}
                    style={{ background: token.colorPrimary, borderColor: token.colorPrimary }} />
                </div>
              </div>
            ))}
          </Card>
        )}
        {productSearch.length >= 1 && !searchingProducts && (products as any[]).length === 0 && (
          <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
            <div style={{ textAlign: 'center', color: '#999', padding: '8px 0' }}>No se encontraron productos</div>
          </Card>
        )}

        {/* Cart */}
        <Card
          size="small"
          title={
            <span>
              <ShoppingCartOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
              Carrito
              {cart.length > 0 && (
                <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>{cart.length} ítem{cart.length !== 1 ? 's' : ''}</Tag>
              )}
            </span>
          }
          extra={cart.length > 0 && (
            <Button size="small" danger type="text" onClick={() => setCart([])}>Limpiar</Button>
          )}
          style={{ flex: 1, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
        >
          {cart.length === 0 ? (
            <Empty
              description={<span style={{ color: '#ccc' }}>Busca y agrega productos al carrito</span>}
              style={{ padding: 40 }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              size="small"
              dataSource={cart}
              columns={cartColumns}
              rowKey="productId"
              pagination={false}
            />
          )}
        </Card>
      </div>

      {/* Right: client + totals */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Client card */}
        <Card
          size="small"
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserOutlined style={{ color: token.colorPrimary }} />
              Cliente
            </span>
          }
          style={{ borderRadius: 10 }}
          styles={{ body: { paddingTop: 10 } }}
        >
          {/* Mode selector */}
          <Segmented
            block
            size="small"
            value={clientMode}
            onChange={v => {
              setClientMode(v as ClientMode)
              setSelectedClient(null)
              setClientSearch('')
              setNewClientName('')
              setNewClientEmail('')
            }}
            options={modeOptions}
            style={{ marginBottom: 12 }}
          />

          {renderClientContent()}
        </Card>

        {/* Register status */}
        <Card size="small" style={{ borderRadius: 10, padding: 0 }} styles={{ body: { padding: '8px 12px' } }}>
          {openRegister
            ? <Badge status="success" text={<span style={{ fontSize: 12 }}>Caja abierta — {openRegister.openedBy?.name ?? '—'}</span>} />
            : <Badge status="error" text={<span style={{ fontSize: 12 }}>Sin caja abierta en esta sucursal</span>} />
          }
        </Card>

        {/* Totals */}
        <Card
          size="small"
          title={<span><DollarOutlined style={{ marginRight: 6, color: token.colorPrimary }} />Totales</span>}
          style={{ borderRadius: 10 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Gravado:</span>
              <span>${totalGravada.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>IVA 13%:</span>
              <span>${totalIva.toFixed(2)}</span>
            </div>
            <Divider style={{ margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
              <span>Total:</span>
              <span style={{ color: token.colorPrimary }}>${totalPagar.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Button
          type="primary"
          size="large"
          block
          icon={<DollarOutlined />}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary, height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10 }}
          onClick={openPayModal}
          disabled={cart.length === 0 || (tipoDte === '03' && !selectedClient)}
        >
          Cobrar ${totalPagar.toFixed(2)}
        </Button>

        {tipoDte === '03' && !selectedClient && (
          <div style={{ fontSize: 11, color: '#fa8c16', textAlign: 'center', marginTop: -8 }}>
            CCF requiere cliente registrado con NIT/NRC
          </div>
        )}
      </div>

      {/* Payment modal */}
      <Modal destroyOnClose
        open={payModal}
        title={
          <span>
            Registrar pago —{' '}
            {clientMode === 'cf' && 'Consumidor Final'}
            {clientMode === 'nuevo' && newClientName}
            {clientMode === 'registrado' && selectedClient?.name}
          </span>
        }
        onCancel={() => setPayModal(false)}
        onOk={() => payForm.submit()}
        confirmLoading={saleMutation.isPending || createClientMut.isPending}
        okText="Confirmar venta"
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={480}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={payForm} layout="vertical" onFinish={submitSale}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: '#f9f9f8', borderRadius: 8, border: '1px solid #e9e9e7' }}>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>Total a cobrar</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: token.colorPrimary }}>${totalPagar.toFixed(2)}</div>
            </div>
            <Tag color={tipoDte === '03' ? 'blue' : 'default'} style={{ fontSize: 13 }}>
              {tipoDte === '03' ? 'Crédito Fiscal' : 'Consumidor Final'}
            </Tag>
          </div>

          <Form.List name="payments" initialValue={[{ formaPago: '01', amount: totalPagar.toFixed(2) }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(field => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'formaPago']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Select style={{ width: 180 }} options={FORMA_PAGO} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'amount']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={0.01} step={0.01} prefix="$" style={{ width: 110 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'reference']} style={{ marginBottom: 0 }}>
                      <Input placeholder="Ref." style={{ width: 90 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ formaPago: '01', amount: 0 })}>
                  + forma de pago
                </Button>
              </>
            )}
          </Form.List>

          {/* Calculadora de vuelto (efectivo) */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#f9f9f8', borderRadius: 8, border: '1px solid #e9e9e7' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: 500 }}>Calculadora de cambio (efectivo)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Recibido del cliente</div>
                <InputNumber
                  prefix="$" min={0} precision={2} style={{ width: '100%' }}
                  value={recibidoEfectivo || undefined}
                  placeholder={totalPagar.toFixed(2)}
                  onChange={v => setRecibidoEfectivo(v || 0)}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Vuelto</div>
                {(() => {
                  const vuelto = parseFloat((recibidoEfectivo - totalPagar).toFixed(2))
                  const color = vuelto < 0 ? token.colorError : token.colorSuccess
                  return (
                    <div style={{ fontSize: 22, fontWeight: 700, color, minWidth: 90, textAlign: 'right' }}>
                      ${Math.max(0, vuelto).toFixed(2)}
                      {vuelto < 0 && recibidoEfectivo > 0 && (
                        <div style={{ fontSize: 11, color: token.colorError, fontWeight: 400 }}>Falta ${Math.abs(vuelto).toFixed(2)}</div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
