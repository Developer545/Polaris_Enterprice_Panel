/**
 * Script: add-product-images.mjs
 * Agrega imágenes automáticas a productos sin imagen usando Loremflickr (sin API key).
 *
 * Uso:
 *   node scripts/add-product-images.mjs <email> <password> <tenant-slug> [companyId]
 *
 * Ejemplo:
 *   node scripts/add-product-images.mjs admin@empresa.com MiPass123 mi-empresa
 */

const API = 'https://polaris-enterprice-panel.onrender.com'

const [,, email, password, tenantSlug, companyIdArg] = process.argv

if (!email || !password || !tenantSlug) {
  console.error('Uso: node scripts/add-product-images.mjs <email> <password> <tenant-slug>')
  process.exit(1)
}

// ── 1. Login ──────────────────────────────────────────────────────────────────
console.log('🔐 Autenticando...')
const loginRes = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
  body: JSON.stringify({ email, password }),
})
if (!loginRes.ok) {
  const err = await loginRes.json()
  console.error('❌ Login falló:', err.message ?? loginRes.status)
  process.exit(1)
}
const loginData = await loginRes.json()
const token = loginData.accessToken ?? loginData.token
if (!token) { console.error('❌ No se recibió token'); process.exit(1) }
const companyId = companyIdArg ?? loginData.user?.companyId
console.log(`✅ Autenticado. CompanyId: ${companyId}`)

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-Tenant-Slug': tenantSlug,
}

// ── 2. Obtener productos sin imagen ───────────────────────────────────────────
console.log('\n📦 Cargando productos...')
let allProducts = []
let page = 1
while (true) {
  const url = `${API}/api/products?companyId=${companyId}&page=${page}&limit=50`
  const res = await fetch(url, { headers })
  if (!res.ok) { console.error('❌ Error cargando productos', res.status); break }
  const data = await res.json()
  allProducts = allProducts.concat(data.data ?? [])
  if (allProducts.length >= (data.total ?? 0) || (data.data?.length ?? 0) === 0) break
  page++
}

const sinImagen = allProducts.filter(p => !p.imageUrl && !p.emoji)
console.log(`Total productos: ${allProducts.length} | Sin imagen: ${sinImagen.length}`)

if (sinImagen.length === 0) {
  console.log('✅ Todos los productos ya tienen imagen o emoji.')
  process.exit(0)
}

// ── 3. Helpers de búsqueda de imagen ─────────────────────────────────────────
function buildKeywords(name) {
  // Limpia el nombre: quita números, caracteres especiales, traduce términos comunes
  const clean = name
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const translations = {
    'leche': 'milk', 'pan': 'bread', 'arroz': 'rice', 'pollo': 'chicken',
    'carne': 'meat', 'agua': 'water', 'aceite': 'oil', 'sal': 'salt',
    'azucar': 'sugar', 'frijol': 'beans', 'maiz': 'corn', 'tomate': 'tomato',
    'cebolla': 'onion', 'papa': 'potato', 'cafe': 'coffee', 'te': 'tea',
    'cerveza': 'beer', 'vino': 'wine', 'jugo': 'juice', 'refresco': 'soda',
    'jabón': 'soap', 'shampoo': 'shampoo', 'detergente': 'detergent',
    'papel': 'paper', 'lapiz': 'pencil', 'cuaderno': 'notebook',
    'celular': 'phone', 'computadora': 'computer', 'television': 'television',
    'camisa': 'shirt', 'pantalon': 'pants', 'zapato': 'shoes', 'vestido': 'dress',
    'medicina': 'medicine', 'vitamina': 'vitamin', 'crema': 'cream',
    'pizza': 'pizza', 'hamburguesa': 'hamburger', 'sandwich': 'sandwich',
    'servicio': 'service', 'mantenimiento': 'maintenance', 'reparacion': 'repair',
  }

  const words = clean.split(' ').slice(0, 3)
  const translated = words.map(w => translations[w] ?? w).filter(w => w.length > 2)
  return translated.length > 0 ? translated.join(',') : 'product'
}

// loremflickr.com — imágenes reales por keyword, sin API key
function imageUrl(keywords) {
  return `https://loremflickr.com/400/400/${encodeURIComponent(keywords)}/all`
}

// ── 4. Subir imagen y actualizar producto ─────────────────────────────────────
let ok = 0, fail = 0

for (const product of sinImagen) {
  const keywords = buildKeywords(product.name)
  const imgSrc   = imageUrl(keywords)

  process.stdout.write(`  → ${product.name.padEnd(35)} [${keywords}] ... `)

  try {
    // Upload via Cloudinary
    const uploadRes = await fetch(`${API}/api/upload/image-from-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: imgSrc, folder: 'polaris/productos' }),
    })
    if (!uploadRes.ok) {
      const e = await uploadRes.json()
      console.log(`❌ upload: ${e.message ?? uploadRes.status}`)
      fail++; continue
    }
    const { imageUrl: cloudUrl } = await uploadRes.json()

    // Actualizar producto
    const updateRes = await fetch(`${API}/api/products/${product.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ imageUrl: cloudUrl }),
    })
    if (!updateRes.ok) {
      const e = await updateRes.json()
      console.log(`❌ update: ${e.message ?? updateRes.status}`)
      fail++; continue
    }

    console.log(`✅`)
    ok++

    // Pausa para no saturar la API (100ms entre productos)
    await new Promise(r => setTimeout(r, 100))

  } catch (e) {
    console.log(`❌ ${e.message}`)
    fail++
  }
}

console.log(`\n✅ Completado: ${ok} imágenes agregadas, ${fail} fallidas`)
