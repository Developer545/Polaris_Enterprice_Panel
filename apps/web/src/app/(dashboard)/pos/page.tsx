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
import { useBarcodeScanner } from '../../../hooks/use-barcode-scanner'

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
  { value: '02', label: 'Tarjeta debito' },
  { value: '03', label: 'Tarjeta credito' },
  { value: '04', label: 'Cheque' },
  { value: '05', label: 'Transferencia bancaria' },
  { value: '08', label: 'Dinero electronico' },
  { value: '09', label: 'Monedero electronico' },
  { value: '11', label: 'Bitcoin' },
  { value: '12', label: 'Otras criptomonedas' },
  { value: '13', label: 'Cuentas por pagar' },
  { value: '14', label: 'Giro bancario' },
  { value: '99', label: 'Otros' },
]
const TILE_COLORS = [
  '#f5222d', '#fa541c', '#fa8c16', '#faad14', '#52c41a',
  '#13c2c2', '#1677ff', '#722ed1', '#eb2f96', '#08979c',
]

function avatarBg(name: string) {
  let h = 0
  for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0)
  return TILE_COLORS[Math.abs(h) % TILE_COLORS.length]
}

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

  // ── Bootstrap: categorías + productos iniciales (100) + caja abierta en 1 request ──
  const { data: bootstrap, isLoading: bootstrapLoading } = useQuery({
    queryKey: ['pos-bootstrap', companyId, branchId],
    queryFn: () =>
      api.get('/api/pos/bootstrap', { params: { companyId, branchId } }).then(r => r.data),
    enabled: !!companyId && !!branchId,
    staleTime: 60_000,
  })

  const categories: any[]  = bootstrap?.categories  ?? []
  const openRegister: any  = bootstrap?.openRegister ?? null

  // ── Products: usa iniciales del bootstrap ó búsqueda/filtro reactiva ──
  const hasFilter = !!deferredProductSearch || !!selectedCategory
  const { data: filteredProducts = [], isFetching: searchingProducts } = useQuery({
    queryKey: ['products-search', companyId, branchId, deferredProductSearch, selectedCategory],
    queryFn: () =>
      api.get('/api/products', {
        params: {
          companyId, branchId,
          search: deferredProductSearch || undefined,
          categoryId: selectedCategory || undefined,
          limit: 100,
        },
      }).then(r => r.data?.data ?? r.data),
    enabled: !!companyId && !!branchId && hasFilter,
    staleTime: 30_000,
  })

  const products = hasFilter ? filteredProducts : (bootstrap?.products ?? [])

  // ── Clients search (user-triggered, ≥2 chars) ──
  const { data: clientResults = [], isFetching: searchingClients } = useQuery({
    queryKey: ['clients-search', companyId, deferredClientSearch],
    queryFn: () => api.get('/api/clients', { params: { companyId, search: deferredClientSearch } }).then(r => r.data),
    enabled: !!companyId && deferredClientSearch.length >= 2 && clientMode === 'registrado',
    staleTime: 30_000,
  })

  // When tipoDte changes to CCF, force registrado mode
  useEffect(() => {
    if (tipoDte === '03' && clientMode === 'cf') {
      setClientMode('registrado')
      setSelectedClient(null)
    }
  }, [tipoDte])

  // Barcode scanner â€” auto-search and add product to cart
  useBarcodeScanner(async (barcode) => {
    if (!companyId) return
    try {
      const res = await api.get('/api/products', {
        params: { companyId, branchId, search: barcode },
      })
      const matches: any[] = res.data ?? []
      const product = matches.find(p => p.sku === barcode || p.barcode === barcode) ?? matches[0]
      if (product) {
        addToCart(product)
        message.success({ content: `Escaneado: ${product.name}`, duration: 1.5 })
      } else {
        message.warning({ content: `CÃ³digo no encontrado: ${barcode}`, duration: 3 })
      }
    } catch {
      message.error({ content: 'Error al buscar por cÃ³digo de barras', duration: 3 })
    }
  }, { enabled: !payModal })

  // F12 drawer + F11 reprint shortcut feedback (Electron only)
  useEffect(() => {
    if (!isElectron) return
    window.electron!.drawer.onShortcut((result) => {
      if (result.ok) {
        message.success({ content: 'CajÃ³n abierto (F12)', duration: 2 })
      } else {
        message.error({ content: `Error cajÃ³n: ${result.error}`, duration: 4 })
      }
    })
    window.electron!.printer.onPrintShortcut((result) => {
      if (result.ok) {
        message.success({ content: 'Ticket reimpreso (F11)', duration: 2 })
      } else {
        message.error({ content: `Error impresiÃ³n: ${result.error}`, duration: 4 })
      }
    })
  }, [])

  const createClientMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/clients', dto).then(r => r.data),
  })

  const saleMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/pos/sale', values),
    onSuccess: (response, variables) => {
      message.success('Venta registrada')

      if (isElectron) {
        const paymentLabel = FORMA_PAGO.find(f => f.value === variables.payments?.[0]?.formaPago)?.label ?? 'Efectivo'
        const saleNumber = response.data?.saleNumber ?? response.data?.id ?? 'â€”'

        const receiptPayload = {
          businessName: (window as any).user?.company?.name ?? (window as any).user?.tenant?.name ?? 'POS DTE',
          branchName: (window as any).user?.branch?.name ?? openRegister?.branch?.name ?? '',
          cashierName: (window as any).user?.name ?? '',
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

        window.electron!.printer.setLastReceipt(receiptPayload).catch(() => {})
      }

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
      message.error('CrÃ©dito Fiscal requiere seleccionar un cliente registrado con NIT/NRC'); return
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
          <div style={{ fontWeight: 500, fontSize: 12 }}>{name}</div>
          {r.trackStock && (
            <Tag color={(r.stock - r.quantity) <= 0 ? 'red' : 'green'} style={{ fontSize: 9, padding: '0 4px', lineHeight: '16px' }}>
              Stock: {r.stock}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Cant.', key: 'qty', width: 80,
      render: (r: CartItem) => (
        <InputNumber
          size="small" min={1}
          max={r.trackStock ? r.stock : undefined}
          value={r.quantity}
          onChange={v => updateQty(r.productId, v ?? 1)}
          style={{ width: 64 }}
        />
      ),
    },
    {
      title: 'Total', key: 'total', width: 80,
      render: (r: CartItem) => {
        const { total } = calcLine(r, tipoDte)
        return <span style={{ fontWeight: 600, color: token.colorPrimary, fontSize: 12 }}>${total.toFixed(2)}</span>
      },
    },
    {
      title: '', key: 'del', width: 36,
      render: (r: CartItem) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => removeFromCart(r.productId)} />
      ),
    },
  ]

  // â”€â”€ Client panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const modeOptions = [
    { label: <span style={{ fontSize: 12 }}><IdcardOutlined style={{ marginRight: 4 }} />CF</span>, value: 'cf', disabled: tipoDte === '03' },
    { label: <span style={{ fontSize: 12 }}><UserAddOutlined style={{ marginRight: 4 }} />Nuevo</span>, value: 'nuevo' },
    { label: <span style={{ fontSize: 12 }}><TeamOutlined style={{ marginRight: 4 }} />Registrado</span>, value: 'registrado' },
  ]

  function renderClientContent() {
    if (clientMode === 'cf') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
          <Avatar style={{ background: '#8c8c8c', flexShrink: 0 }} size={32} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>Consumidor Final</div>
            <div style={{ fontSize: 11, color: '#999' }}>Sin cliente especÃ­fico</div>
          </div>
          <Tag color="default" style={{ marginLeft: 'auto', fontSize: 10 }}>CF</Tag>
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
            placeholder="Correo (opcional)"
            value={newClientEmail}
            onChange={e => setNewClientEmail(e.target.value)}
            size="small"
            type="email"
          />
          {newClientName.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f5f5f5', borderRadius: 6 }}>
              <Avatar style={{ background: token.colorPrimary }} size={26}>
                {newClientName[0]?.toUpperCase()}
              </Avatar>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{newClientName}</div>
                {newClientEmail && <div style={{ color: '#999', fontSize: 11 }}>{newClientEmail}</div>}
              </div>
              <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 10 }}>Nuevo</Tag>
            </div>
          )}
        </div>
      )
    }

    if (selectedClient) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px' }}>
          <Avatar style={{ background: selectedClient.esCreditoFiscal ? token.colorInfo : token.colorSuccess, fontWeight: 700 }} size={32}>
            {selectedClient.name?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClient.name}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {selectedClient.numDocumento ?? selectedClient.email ?? 'â€”'}
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
          <div style={{ marginTop: 6, maxHeight: 140, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
            {(clientResults as any[]).map((c: any) => (
              <div
                key={c.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => { setSelectedClient(c); setClientSearch('') }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar size={24} style={{ background: c.esCreditoFiscal ? token.colorInfo : token.colorSuccess, fontSize: 10, fontWeight: 700 }}>
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
          <div style={{ fontSize: 11, color: '#999', textAlign: 'center', padding: '8px 0' }}>
            Sin resultados
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 112px)', display: 'flex', gap: 16 }}>

      {/* â”€â”€ Left: product browser â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 8 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={tipoDte}
            onChange={v => { setTipoDte(v); if (v === '03' && clientMode === 'cf') setClientMode('registrado') }}
            style={{ width: 168 }}
            options={[
              { value: '01', label: <><Tag color="default" style={{ fontSize: 11 }}>01</Tag> Consumidor Final</> },
              { value: '03', label: <><Tag color="blue" style={{ fontSize: 11 }}>03</Tag> CrÃ©dito Fiscal</> },
            ]}
          />
          <Input
            placeholder="Buscar producto por nombre, SKU o cÃ³digo de barras..."
            prefix={<SearchOutlined />}
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ flex: 1 }}
            allowClear
            suffix={searchingProducts ? <Spin size="small" /> : null}
          />
        </div>

        {/* Category chips */}
        {(categories as any[]).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

        {/* Product tile grid */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {searchingProducts ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <Spin size="large" />
            </div>
          ) : (products as any[]).length === 0 ? (
            <Empty
              description={<span style={{ color: '#ccc' }}>Sin productos. Busca o filtra por categorÃ­a.</span>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 48 }}
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
              gap: 8,
              paddingBottom: 8,
            }}>
              {(products as any[]).map((p: any) => {
                const inCart = cart.find(c => c.productId === p.id)
                const bg = avatarBg(p.name)
                const isLowStock = p.trackStock && (p.stock ?? 0) <= (p.minStock ?? 0)
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      background: inCart ? `${bg}14` : token.colorBgContainer,
                      border: `1.5px solid ${inCart ? bg : token.colorBorder}`,
                      borderRadius: 10,
                      padding: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      position: 'relative',
                      userSelect: 'none',
                      transition: 'border-color .15s, transform .15s, box-shadow .15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'translateY(-2px)'
                      el.style.boxShadow = '0 6px 16px -6px rgba(0,0,0,.18)'
                      if (!inCart) el.style.borderColor = token.colorText
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = ''
                      el.style.boxShadow = ''
                      el.style.borderColor = inCart ? bg : token.colorBorder
                    }}
                  >
                    {/* In-cart badge */}
                    {inCart && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: bg, color: '#fff',
                        borderRadius: 99, fontSize: 10, fontWeight: 700,
                        padding: '1px 7px', lineHeight: '16px',
                        pointerEvents: 'none',
                      }}>
                        Ã—{inCart.quantity}
                      </div>
                    )}

                    {/* Thumb */}
                    <div style={{
                      height: 54,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${bg}28, ${bg}0a)`,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: p.emoji ? 28 : 22,
                      fontWeight: p.emoji ? 400 : 800,
                      color: bg,
                      letterSpacing: -1,
                    }}>
                      {p.emoji || p.name[0]?.toUpperCase()}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: token.colorText,
                      wordBreak: 'break-word',
                    }}>
                      {p.name}
                    </div>

                    {/* Price + stock */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: token.colorPrimary,
                      }}>
                        ${Number(p.price).toFixed(2)}
                      </span>
                      {p.trackStock && (
                        <Tag
                          color={isLowStock ? 'red' : 'green'}
                          style={{ fontSize: 9, padding: '0 4px', margin: 0, lineHeight: '16px' }}
                        >
                          {p.stock}
                        </Tag>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Right: cart + client + totals â”€â”€ */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Cart */}
        <Card
          size="small"
          title={
            <span>
              <ShoppingCartOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
              Carrito
              {cart.length > 0 && (
                <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>
                  {cart.length} Ã­tem{cart.length !== 1 ? 's' : ''}
                </Tag>
              )}
            </span>
          }
          extra={cart.length > 0 && (
            <Button size="small" danger type="text" onClick={() => setCart([])}>Limpiar</Button>
          )}
          style={{ flex: 1, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
        >
          {cart.length === 0 ? (
            <Empty
              description={<span style={{ color: '#ccc' }}>Clic en productos para agregar</span>}
              style={{ padding: 32 }}
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

        {/* Client */}
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
        <Card size="small" style={{ borderRadius: 10 }} styles={{ body: { padding: '8px 12px' } }}>
          {openRegister
            ? <Badge status="success" text={<span style={{ fontSize: 12 }}>Caja abierta â€” {openRegister.openedBy?.name ?? 'â€”'}</span>} />
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
          style={{
            background: token.colorPrimary,
            borderColor: token.colorPrimary,
            height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10,
          }}
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

      {/* â”€â”€ Payment modal â”€â”€ */}
      <Modal destroyOnClose
        open={payModal}
        title={
          <span>
            Registrar pago â€”{' '}
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
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, padding: '10px 14px',
            background: '#f9f9f8', borderRadius: 8, border: '1px solid #e9e9e7',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>Total a cobrar</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: token.colorPrimary }}>${totalPagar.toFixed(2)}</div>
            </div>
            <Tag color={tipoDte === '03' ? 'blue' : 'default'} style={{ fontSize: 13 }}>
              {tipoDte === '03' ? 'CrÃ©dito Fiscal' : 'Consumidor Final'}
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

          {/* Calculadora de vuelto */}
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
