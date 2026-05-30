// Catálogos oficiales Ministerio de Hacienda El Salvador
// Fuente base: Guía de Integración Factura Electrónica SV y CAT-002.

import {
  CATALOGO_TIPO_DTE,
  DTE_SCHEMA_NAME_BY_TYPE,
  DTE_TYPE_VALUES,
  DTE_VERSION_BY_TYPE,
  getDteVersion,
  isTipoDte,
  type TipoDte,
} from '@pos-dte/shared-types'
export {
  CAT_005_TIPO_CONTINGENCIA,
  CONTINGENCY_DTE_BATCH_DEADLINE_HOURS,
  CONTINGENCY_EVENT_DEADLINE_HOURS,
  CONTINGENCY_MAX_DOCUMENTS,
  CONTINGENCY_EVENT_VERSION,
  DTE_NORMATIVE_EFFECTIVE_DATE,
  INVALIDATION_EVENT_VERSION,
} from '../regulatory'

export {
  CATALOGO_TIPO_DTE,
  DTE_SCHEMA_NAME_BY_TYPE,
  DTE_TYPE_VALUES,
  DTE_VERSION_BY_TYPE,
  getDteVersion,
  isTipoDte,
  type TipoDte,
}

export const CAT_001_AMBIENTE = {
  PRUEBAS: '00',
  PRODUCCION: '01',
} as const

export const CAT_002_TIPO_DTE = {
  FACTURA: '01',
  COMPROBANTE_CREDITO_FISCAL: '03',
  NOTA_REMISION: '04',
  NOTA_CREDITO: '05',
  NOTA_DEBITO: '06',
  COMPROBANTE_RETENCION: '07',
  COMPROBANTE_LIQUIDACION: '08',
  DOC_CONTABLE_LIQUIDACION: '09',
  FACTURA_EXPORTACION: '11',
  FACTURA_SUJETO_EXCLUIDO: '14',
  COMPROBANTE_DONACION: '15',
  EVENTO_OPERACIONES_ESPECIALES: '17',
  EVENTO_RETORNO: '18',
} as const satisfies Record<string, string>

export const CAT_011_TIPO_ITEM = {
  BIEN: 1,
  SERVICIO: 2,
  AMBOS: 3,
  OTROS_CARGOS: 4,
} as const

export const CAT_005_TIPO_ITEM = CAT_011_TIPO_ITEM

export const CAT_014_UNIDAD_MEDIDA = {
  METRO: 1,
  YARDA: 2,
  MILIMETRO: 6,
  KILOMETRO_CUADRADO: 9,
  HECTAREA: 10,
  METRO_CUADRADO: 13,
  VARA_CUADRADA: 15,
  METRO_CUBICO: 18,
  BARRIL: 20,
  GALON: 22,
  LITRO: 23,
  BOTELLA: 24,
  MILILITRO: 26,
  TONELADA: 30,
  QUINTAL: 32,
  ARROBA: 33,
  KILOGRAMO: 34,
  LIBRA: 36,
  ONZA_TROY: 37,
  ONZA: 38,
  GRAMO: 39,
  MILIGRAMO: 40,
  MEGAWATT: 42,
  KILOWATT: 43,
  WATT: 44,
  MEGAVOLTIO_AMPERIO: 45,
  KILOVOLTIO_AMPERIO: 46,
  VOLTIO_AMPERIO: 47,
  GIGAWATT_HORA: 49,
  MEGAWATT_HORA: 50,
  KILOWATT_HORA: 51,
  WATT_HORA: 52,
  KILOVOLTIO: 53,
  VOLTIO: 54,
  MILLAR: 55,
  MEDIO_MILLAR: 56,
  CIENTO: 57,
  DOCENA: 58,
  UNIDAD: 59,
  OTRO: 99,
} as const

export const CAT_017_FORMA_PAGO = {
  EFECTIVO: '01',
  TARJETA_DEBITO: '02',
  TARJETA_CREDITO: '03',
  CHEQUE: '04',
  TRANSFERENCIA: '05',
  DINERO_ELECTRONICO: '08',
  MONEDERO_ELECTRONICO: '09',
  BITCOIN: '11',
  OTRAS_CRIPTOMONEDAS: '12',
  CUENTAS_POR_PAGAR_RECEPTOR: '13',
  GIRO_BANCARIO: '14',
  OTROS: '99',
} as const

export const CAT_019_CONDICION_OPERACION = {
  CONTADO: 1,
  CREDITO: 2,
  OTRO: 3,
} as const

export const CAT_030_TRANSPORTE = {
  TERRESTRE: 1,
  AEREO: 2,
  MARITIMO: 3,
  FERREO: 4,
  MULTIMODAL: 5,
  CORREO: 6,
} as const

export const CAT_031_INCOTERMS = {
  EXW: '01',
  FCA: '02',
  CPT: '03',
  CIP: '04',
  DAP: '05',
  DPU: '06',
  DDP: '07',
  FAS: '08',
  FOB: '09',
  CFR: '10',
  CIF: '11',
} as const

export const CAT_032_DOMICILIO_FISCAL = {
  DOMICILIADO: 1,
  NO_DOMICILIADO: 2,
} as const

export const CAT_033_TIPO_REGIMEN = {
  EXPORTACION_DEFINITIVA: 'EX-1',
  EXPORTACION_TEMPORAL: 'EX-2',
  REEXPORTACION: 'EX-3',
  TRANSITO_ADUANERO: 'TA-1',
} as const

export const CAT_022_TIPO_DOCUMENTO_RECEPTOR = {
  NIT: '36',
  DUI: '13',
  OTRO: '37',
  PASAPORTE: '03',
  CARNET_RESIDENTE: '02',
  NRC: '36', // alias
} as const

// Departamentos El Salvador — CAT-012 Hacienda
export const DEPARTAMENTOS: Record<string, string> = {
  '01': 'Ahuachapán',
  '02': 'Santa Ana',
  '03': 'Sonsonate',
  '04': 'Chalatenango',
  '05': 'La Libertad',
  '06': 'San Salvador',
  '07': 'Cuscatlán',
  '08': 'La Paz',
  '09': 'Cabañas',
  '10': 'San Vicente',
  '11': 'Usulután',
  '12': 'San Miguel',
  '13': 'Morazán',
  '14': 'La Unión',
}

export const CAT_012_DEPARTAMENTOS = {
  '00': 'Otro (Para extranjeros)',
  '01': 'Ahuachapan',
  '02': 'Santa Ana',
  '03': 'Sonsonate',
  '04': 'Chalatenango',
  '05': 'La Libertad',
  '06': 'San Salvador',
  '07': 'Cuscatlan',
  '08': 'La Paz',
  '09': 'Cabanas',
  '10': 'San Vicente',
  '11': 'Usulutan',
  '12': 'San Miguel',
  '13': 'Morazan',
  '14': 'La Union',
} as const

export const CAT_013_MUNICIPIOS: Record<string, Record<string, string>> = {
  '00': { '00': 'Otro (Para extranjeros)' },
  '01': { '13': 'AHUACHAPAN NORTE', '14': 'AHUACHAPAN CENTRO', '15': 'AHUACHAPAN SUR' },
  '02': { '14': 'SANTA ANA NORTE', '15': 'SANTA ANA CENTRO', '16': 'SANTA ANA ESTE', '17': 'SANTA ANA OESTE' },
  '03': { '17': 'SONSONATE NORTE', '18': 'SONSONATE CENTRO', '19': 'SONSONATE ESTE', '20': 'SONSONATE OESTE' },
  '04': { '34': 'CHALATENANGO NORTE', '35': 'CHALATENANGO CENTRO', '36': 'CHALATENANGO SUR' },
  '05': { '23': 'LA LIBERTAD NORTE', '24': 'LA LIBERTAD CENTRO', '25': 'LA LIBERTAD OESTE', '26': 'LA LIBERTAD ESTE', '27': 'LA LIBERTAD COSTA', '28': 'LA LIBERTAD SUR' },
  '06': { '20': 'SAN SALVADOR NORTE', '21': 'SAN SALVADOR OESTE', '22': 'SAN SALVADOR ESTE', '23': 'SAN SALVADOR CENTRO', '24': 'SAN SALVADOR SUR' },
  '07': { '17': 'CUSCATLAN NORTE', '18': 'CUSCATLAN SUR' },
  '08': { '23': 'LA PAZ OESTE', '24': 'LA PAZ CENTRO', '25': 'LA PAZ ESTE' },
  '09': { '10': 'CABANAS OESTE', '11': 'CABANAS ESTE' },
  '10': { '14': 'SAN VICENTE NORTE', '15': 'SAN VICENTE SUR' },
  '11': { '24': 'USULUTAN NORTE', '25': 'USULUTAN ESTE', '26': 'USULUTAN OESTE' },
  '12': { '21': 'SAN MIGUEL NORTE', '22': 'SAN MIGUEL CENTRO', '23': 'SAN MIGUEL OESTE' },
  '13': { '27': 'MORAZAN NORTE', '28': 'MORAZAN SUR' },
  '14': { '19': 'LA UNION NORTE', '20': 'LA UNION SUR' },
}

/**
 * Municipios reales por departamento — 231 municipios de El Salvador.
 * Clave: { [departamentoCod (2 dígitos)]: { [municipioCod (2 dígitos)]: nombre } }
 *
 * IMPORTANTE — diferencia con CAT_013_MUNICIPIOS:
 *  • MUNICIPIOS     → catálogo completo (231 municipios). Usado como seed inicial para
 *                     la base de datos admin. Los selects UI del cliente consumen los datos
 *                     de BD (GET /api/catalogs/departamentos/:cod/municipios), NO este objeto.
 *  • CAT_013_MUNICIPIOS → 44 zonas fiscales MH. Los códigos de zona son los que van en el
 *                     campo `municipio` del JSON DTE (estructura direccion{}). No son
 *                     nombres de municipios reales sino regiones geográficas de tributación.
 *
 * @deprecated Para mostrar municipios en la UI, usar la BD (servicio de catálogos).
 *             Para generar el JSON DTE, usar CAT_013_MUNICIPIOS o getZona().
 */
export const MUNICIPIOS: Record<string, Record<string, string>> = {
  '01': { // Ahuachapán — 12 municipios
    '01': 'Ahuachapán', '02': 'Apaneca', '03': 'Atiquizaya',
    '04': 'Concepción de Ataco', '05': 'El Refugio', '06': 'Guaymango',
    '07': 'Jujutla', '08': 'San Francisco Menéndez', '09': 'San Lorenzo',
    '10': 'San Pedro Puxtla', '11': 'Tacuba', '12': 'Turín',
  },
  '02': { // Santa Ana — 13 municipios
    '01': 'Santa Ana', '02': 'Candelaria de la Frontera', '03': 'Chalchuapa',
    '04': 'Coatepeque', '05': 'El Congo', '06': 'El Porvenir',
    '07': 'Masahuat', '08': 'Metapán', '09': 'San Antonio Pajonal',
    '10': 'San Sebastián Salitrillo', '11': 'Santa Rosa Guachipilín',
    '12': 'Santiago de la Frontera', '13': 'Texistepeque',
  },
  '03': { // Sonsonate — 16 municipios
    '01': 'Sonsonate', '02': 'Acajutla', '03': 'Armenia',
    '04': 'Caluco', '05': 'Cuisnahuat', '06': 'Izalco',
    '07': 'Juayúa', '08': 'Nahuizalco', '09': 'Nahulingo',
    '10': 'Salcoatitán', '11': 'San Antonio del Monte', '12': 'San Julián',
    '13': 'Santa Catarina Masahuat', '14': 'Santa Isabel Ishuatán',
    '15': 'Santo Domingo de Guzmán', '16': 'Sonzacate',
  },
  '04': { // Chalatenango — 32 municipios
    '01': 'Chalatenango', '02': 'Agua Caliente', '03': 'Arcatao',
    '04': 'Azacualpa', '05': 'Cancasque', '06': 'Citalá',
    '07': 'Comalapa', '08': 'Concepción Quezaltepeque', '09': 'Dulce Nombre de María',
    '10': 'El Carrizal', '11': 'El Paraíso', '12': 'La Laguna',
    '13': 'La Palma', '14': 'La Reina', '15': 'Las Vueltas',
    '16': 'Nombre de Jesús', '17': 'Nueva Concepción', '18': 'Nueva Trinidad',
    '19': 'Ojos de Agua', '20': 'Potonico', '21': 'San Antonio de la Cruz',
    '22': 'San Antonio Los Ranchos', '23': 'San Fernando', '24': 'San Francisco Lempa',
    '25': 'San Francisco Morazán', '26': 'San Ignacio', '27': 'San Isidro Labrador',
    '28': 'San Luis del Carmen', '29': 'San Miguel de Mercedes', '30': 'San Rafael',
    '31': 'Santa Rita', '32': 'Tejutla',
  },
  '05': { // La Libertad — 22 municipios
    '01': 'Santa Tecla', '02': 'Antiguo Cuscatlán', '03': 'Chiltiupán',
    '04': 'Ciudad Arce', '05': 'Colón', '06': 'Comasagua',
    '07': 'Huizúcar', '08': 'Jayaque', '09': 'Jicalapa',
    '10': 'La Libertad', '11': 'Nuevo Cuscatlán', '12': 'Quezaltepeque',
    '13': 'Sacacoyo', '14': 'San José Villanueva', '15': 'San Juan Opico',
    '16': 'San Matías', '17': 'San Pablo Tacachico', '18': 'Talnique',
    '19': 'Tamanique', '20': 'Teotepeque', '21': 'Tepecoyo',
    '22': 'Zaragoza',
  },
  '06': { // San Salvador — 19 municipios
    '01': 'San Salvador', '02': 'Aguilares', '03': 'Apopa',
    '04': 'Ayutuxtepeque', '05': 'Cuscatancingo', '06': 'Delgado',
    '07': 'El Paisnal', '08': 'Guazapa', '09': 'Ilopango',
    '10': 'Mejicanos', '11': 'Nejapa', '12': 'Panchimalco',
    '13': 'Rosario de Mora', '14': 'San Marcos', '15': 'San Martín',
    '16': 'Santiago Texacuangos', '17': 'Santo Tomás', '18': 'Soyapango',
    '19': 'Tonacatepeque',
  },
  '07': { // Cuscatlán — 14 municipios
    '01': 'Cojutepeque', '02': 'Candelaria', '03': 'El Carmen',
    '04': 'El Rosario', '05': 'Monte San Juan', '06': 'Oratorio de Concepción',
    '07': 'San Bartolomé Perulapía', '08': 'San Cristóbal', '09': 'San José Guayabal',
    '10': 'San Pedro Perulapán', '11': 'San Ramón', '12': 'Santa Cruz Analquito',
    '13': 'Santa Cruz Michapa', '14': 'Suchitoto',
  },
  '08': { // La Paz — 22 municipios
    '01': 'Zacatecoluca', '02': 'Cuyultitán', '03': 'El Rosario',
    '04': 'Jerusalén', '05': 'Mercedes La Ceiba', '06': 'Olocuilta',
    '07': 'Paraíso de Osorio', '08': 'San Antonio Masahuat', '09': 'San Emigdio',
    '10': 'San Francisco Chinameca', '11': 'San Juan Nonualco', '12': 'San Juan Talpa',
    '13': 'San Juan Tepezontes', '14': 'San Luis La Herradura', '15': 'San Luis Talpa',
    '16': 'San Miguel Tepezontes', '17': 'San Pedro Masahuat', '18': 'San Pedro Nonualco',
    '19': 'San Rafael Obrajuelo', '20': 'Santa María Ostuma', '21': 'Santiago Nonualco',
    '22': 'Tapalhuaca',
  },
  '09': { // Cabañas — 9 municipios
    '01': 'Sensuntepeque', '02': 'Cinquera', '03': 'Dolores',
    '04': 'Guacotecti', '05': 'Ilobasco', '06': 'Jutiapa',
    '07': 'San Isidro', '08': 'Tejutepeque', '09': 'Victoria',
  },
  '10': { // San Vicente — 13 municipios
    '01': 'San Vicente', '02': 'Apastepeque', '03': 'Guadalupe',
    '04': 'San Cayetano Istepeque', '05': 'San Esteban Catarina', '06': 'San Ildefonso',
    '07': 'San Lorenzo', '08': 'San Sebastián', '09': 'Santa Clara',
    '10': 'Santo Domingo', '11': 'Tecoluca', '12': 'Tepetitán',
    '13': 'Verapaz',
  },
  '11': { // Usulután — 24 municipios
    '01': 'Usulután', '02': 'Alegría', '03': 'Berlín',
    '04': 'California', '05': 'Concepción Batres', '06': 'El Triunfo',
    '07': 'Ereguayquín', '08': 'Estanzuelas', '09': 'General Pedro Ávila',
    '10': 'Jiquilisco', '11': 'Jucuapa', '12': 'Jucuarán',
    '13': 'Mercedes Umaña', '14': 'Nueva Granada', '15': 'Ozatlán',
    '16': 'Puerto El Triunfo', '17': 'San Agustín', '18': 'San Buenaventura',
    '19': 'San Dionisio', '20': 'San Francisco Javier', '21': 'Santa Elena',
    '22': 'Santa María', '23': 'Santiago de María', '24': 'Tecapán',
  },
  '12': { // San Miguel — 20 municipios
    '01': 'San Miguel', '02': 'Carolina', '03': 'Chapeltique',
    '04': 'Chinameca', '05': 'Chirilagua', '06': 'Ciudad Barrios',
    '07': 'Comacarán', '08': 'El Tránsito', '09': 'Lolotique',
    '10': 'Moncagua', '11': 'Nueva Guadalupe', '12': 'Nuevo Edén de San Juan',
    '13': 'Quelepa', '14': 'San Antonio', '15': 'San Gerardo',
    '16': 'San Jorge', '17': 'San Luis de la Reina', '18': 'San Rafael Oriente',
    '19': 'Sesori', '20': 'Uluazapa',
  },
  '13': { // Morazán — 26 municipios
    '01': 'San Francisco Gotera', '02': 'Arambala', '03': 'Cacaopera',
    '04': 'Corinto', '05': 'Chilanga', '06': 'Delicias de Concepción',
    '07': 'El Divisadero', '08': 'El Rosario', '09': 'Gualococti',
    '10': 'Guatajiagua', '11': 'Joateca', '12': 'Jocoaitique',
    '13': 'Jocoro', '14': 'Lolotiquillo', '15': 'Meanguera',
    '16': 'Osicala', '17': 'Perquín', '18': 'San Carlos',
    '19': 'San Fernando', '20': 'San Isidro', '21': 'San Simón',
    '22': 'Sensembra', '23': 'Sociedad', '24': 'Torola',
    '25': 'Yamabal', '26': 'Yoloaiquín',
  },
  '14': { // La Unión — 18 municipios
    '01': 'La Unión', '02': 'Anamorós', '03': 'Bolívar',
    '04': 'Concepción de Oriente', '05': 'Conchagua', '06': 'El Carmen',
    '07': 'El Sauce', '08': 'Intipucá', '09': 'Lislique',
    '10': 'Meanguera del Golfo', '11': 'Nueva Esparta', '12': 'Pasaquina',
    '13': 'Polorós', '14': 'San Alejo', '15': 'San José',
    '16': 'Santa Rosa de Lima', '17': 'Yayantique', '18': 'Yucuaiquín',
  },
}

/** Helper: retorna municipios de un departamento como array { codigo, nombre } */
export function getMunicipios(departamentoCod: string): { codigo: string; nombre: string }[] {
  const munis = CAT_013_MUNICIPIOS[departamentoCod]
  if (!munis) return []
  return Object.entries(munis).map(([codigo, nombre]) => ({ codigo, nombre }))
}

/**
 * Zona geográfica por municipio (clave: `${deptoCod}/${municipioCod}`)
 * Referencia para formularios y complemento de dirección.
 * NO es campo DTE — es orientación geográfica para el operador.
 *
 * San Salvador: Centro / Norte / Sur / Este / Oeste
 * Resto de departamentos: cabecera o punto cardinal según ubicación
 */
export const ZONA_POR_MUNICIPIO: Record<string, string> = {
  // ── San Salvador (06) ────────────────────────────────────────────────────
  '06/01': 'San Salvador Centro',
  '06/02': 'San Salvador Norte',   // Aguilares
  '06/03': 'San Salvador Norte',   // Apopa
  '06/04': 'San Salvador Norte',   // Ayutuxtepeque
  '06/05': 'San Salvador Norte',   // Cuscatancingo
  '06/06': 'San Salvador Norte',   // Delgado
  '06/07': 'San Salvador Norte',   // El Paisnal
  '06/08': 'San Salvador Norte',   // Guazapa
  '06/09': 'San Salvador Este',    // Ilopango
  '06/10': 'San Salvador Norte',   // Mejicanos
  '06/11': 'San Salvador Oeste',   // Nejapa
  '06/12': 'San Salvador Sur',     // Panchimalco
  '06/13': 'San Salvador Sur',     // Rosario de Mora
  '06/14': 'San Salvador Sur',     // San Marcos
  '06/15': 'San Salvador Este',    // San Martín
  '06/16': 'San Salvador Sur',     // Santiago Texacuangos
  '06/17': 'San Salvador Sur',     // Santo Tomás
  '06/18': 'San Salvador Este',    // Soyapango
  '06/19': 'San Salvador Norte',   // Tonacatepeque

  // ── La Libertad (05) ─────────────────────────────────────────────────────
  '05/01': 'Santa Tecla',          // cabecera
  '05/02': 'San Salvador Oeste',   // Antiguo Cuscatlán (metro)
  '05/03': 'La Libertad Oeste',    // Chiltiupán
  '05/04': 'La Libertad Norte',    // Ciudad Arce
  '05/05': 'La Libertad Central',  // Colón
  '05/06': 'La Libertad Sur',      // Comasagua
  '05/07': 'La Libertad Sur',      // Huizúcar
  '05/08': 'La Libertad Oeste',    // Jayaque
  '05/09': 'La Libertad Oeste',    // Jicalapa
  '05/10': 'La Libertad Sur',      // La Libertad (puerto)
  '05/11': 'San Salvador Oeste',   // Nuevo Cuscatlán (metro)
  '05/12': 'La Libertad Norte',    // Quezaltepeque
  '05/13': 'La Libertad Central',  // Sacacoyo
  '05/14': 'La Libertad Sur',      // San José Villanueva
  '05/15': 'La Libertad Norte',    // San Juan Opico
  '05/16': 'La Libertad Norte',    // San Matías
  '05/17': 'La Libertad Norte',    // San Pablo Tacachico
  '05/18': 'La Libertad Central',  // Talnique
  '05/19': 'La Libertad Oeste',    // Tamanique
  '05/20': 'La Libertad Oeste',    // Teotepeque
  '05/21': 'La Libertad Central',  // Tepecoyo
  '05/22': 'La Libertad Sur',      // Zaragoza

  // ── Ahuachapán (01) ──────────────────────────────────────────────────────
  '01/01': 'Ahuachapán Central',   '01/02': 'Ahuachapán Norte',
  '01/03': 'Ahuachapán Norte',     '01/04': 'Ahuachapán Sur',
  '01/05': 'Ahuachapán Norte',     '01/06': 'Ahuachapán Sur',
  '01/07': 'Ahuachapán Sur',       '01/08': 'Ahuachapán Oeste',
  '01/09': 'Ahuachapán Norte',     '01/10': 'Ahuachapán Sur',
  '01/11': 'Ahuachapán Norte',     '01/12': 'Ahuachapán Norte',

  // ── Santa Ana (02) ───────────────────────────────────────────────────────
  '02/01': 'Santa Ana Central',    '02/02': 'Santa Ana Oeste',
  '02/03': 'Santa Ana Sur',        '02/04': 'Santa Ana Sur',
  '02/05': 'Santa Ana Este',       '02/06': 'Santa Ana Norte',
  '02/07': 'Santa Ana Norte',      '02/08': 'Santa Ana Norte',
  '02/09': 'Santa Ana Oeste',      '02/10': 'Santa Ana Norte',
  '02/11': 'Santa Ana Oeste',      '02/12': 'Santa Ana Oeste',
  '02/13': 'Santa Ana Norte',

  // ── Sonsonate (03) ───────────────────────────────────────────────────────
  '03/01': 'Sonsonate Central',    '03/02': 'Sonsonate Sur',
  '03/03': 'Sonsonate Este',       '03/04': 'Sonsonate Norte',
  '03/05': 'Sonsonate Norte',      '03/06': 'Sonsonate Este',
  '03/07': 'Sonsonate Norte',      '03/08': 'Sonsonate Norte',
  '03/09': 'Sonsonate Sur',        '03/10': 'Sonsonate Norte',
  '03/11': 'Sonsonate Central',    '03/12': 'Sonsonate Norte',
  '03/13': 'Sonsonate Norte',      '03/14': 'Sonsonate Sur',
  '03/15': 'Sonsonate Norte',      '03/16': 'Sonsonate Central',

  // ── Chalatenango (04) ────────────────────────────────────────────────────
  '04/01': 'Chalatenango Central', '04/02': 'Chalatenango Sur',
  '04/03': 'Chalatenango Norte',   '04/04': 'Chalatenango Sur',
  '04/05': 'Chalatenango Sur',     '04/06': 'Chalatenango Norte',
  '04/07': 'Chalatenango Sur',     '04/08': 'Chalatenango Central',
  '04/09': 'Chalatenango Norte',   '04/10': 'Chalatenango Sur',
  '04/11': 'Chalatenango Sur',     '04/12': 'Chalatenango Norte',
  '04/13': 'Chalatenango Norte',   '04/14': 'Chalatenango Norte',
  '04/15': 'Chalatenango Norte',   '04/16': 'Chalatenango Central',
  '04/17': 'Chalatenango Sur',     '04/18': 'Chalatenango Norte',
  '04/19': 'Chalatenango Sur',     '04/20': 'Chalatenango Norte',
  '04/21': 'Chalatenango Sur',     '04/22': 'Chalatenango Norte',
  '04/23': 'Chalatenango Norte',   '04/24': 'Chalatenango Norte',
  '04/25': 'Chalatenango Norte',   '04/26': 'Chalatenango Norte',
  '04/27': 'Chalatenango Central', '04/28': 'Chalatenango Norte',
  '04/29': 'Chalatenango Central', '04/30': 'Chalatenango Central',
  '04/31': 'Chalatenango Norte',   '04/32': 'Chalatenango Central',

  // ── Cuscatlán (07) ───────────────────────────────────────────────────────
  '07/01': 'Cuscatlán Central',    '07/02': 'Cuscatlán Sur',
  '07/03': 'Cuscatlán Sur',        '07/04': 'Cuscatlán Sur',
  '07/05': 'Cuscatlán Central',    '07/06': 'Cuscatlán Central',
  '07/07': 'Cuscatlán Sur',        '07/08': 'Cuscatlán Sur',
  '07/09': 'Cuscatlán Sur',        '07/10': 'Cuscatlán Central',
  '07/11': 'Cuscatlán Norte',      '07/12': 'Cuscatlán Central',
  '07/13': 'Cuscatlán Central',    '07/14': 'Cuscatlán Norte',

  // ── La Paz (08) ──────────────────────────────────────────────────────────
  '08/01': 'La Paz Central',       '08/02': 'La Paz Sur',
  '08/03': 'La Paz Norte',         '08/04': 'La Paz Norte',
  '08/05': 'La Paz Norte',         '08/06': 'La Paz Sur',
  '08/07': 'La Paz Norte',         '08/08': 'La Paz Norte',
  '08/09': 'La Paz Norte',         '08/10': 'La Paz Norte',
  '08/11': 'La Paz Central',       '08/12': 'La Paz Sur',
  '08/13': 'La Paz Norte',         '08/14': 'La Paz Sur',
  '08/15': 'La Paz Sur',           '08/16': 'La Paz Norte',
  '08/17': 'La Paz Central',       '08/18': 'La Paz Central',
  '08/19': 'La Paz Norte',         '08/20': 'La Paz Norte',
  '08/21': 'La Paz Central',       '08/22': 'La Paz Sur',

  // ── Cabañas (09) ─────────────────────────────────────────────────────────
  '09/01': 'Cabañas Central',      '09/02': 'Cabañas Sur',
  '09/03': 'Cabañas Sur',          '09/04': 'Cabañas Central',
  '09/05': 'Cabañas Sur',          '09/06': 'Cabañas Norte',
  '09/07': 'Cabañas Central',      '09/08': 'Cabañas Norte',
  '09/09': 'Cabañas Norte',

  // ── San Vicente (10) ─────────────────────────────────────────────────────
  '10/01': 'San Vicente Central',  '10/02': 'San Vicente Norte',
  '10/03': 'San Vicente Sur',      '10/04': 'San Vicente Norte',
  '10/05': 'San Vicente Norte',    '10/06': 'San Vicente Norte',
  '10/07': 'San Vicente Norte',    '10/08': 'San Vicente Norte',
  '10/09': 'San Vicente Central',  '10/10': 'San Vicente Norte',
  '10/11': 'San Vicente Sur',      '10/12': 'San Vicente Central',
  '10/13': 'San Vicente Norte',

  // ── Usulután (11) ────────────────────────────────────────────────────────
  '11/01': 'Usulután Central',     '11/02': 'Usulután Norte',
  '11/03': 'Usulután Norte',       '11/04': 'Usulután Oeste',
  '11/05': 'Usulután Sur',         '11/06': 'Usulután Norte',
  '11/07': 'Usulután Sur',         '11/08': 'Usulután Central',
  '11/09': 'Usulután Oeste',       '11/10': 'Usulután Sur',
  '11/11': 'Usulután Oeste',       '11/12': 'Usulután Sur',
  '11/13': 'Usulután Oeste',       '11/14': 'Usulután Oeste',
  '11/15': 'Usulután Sur',         '11/16': 'Usulután Sur',
  '11/17': 'Usulután Norte',       '11/18': 'Usulután Sur',
  '11/19': 'Usulután Sur',         '11/20': 'Usulután Oeste',
  '11/21': 'Usulután Central',     '11/22': 'Usulután Sur',
  '11/23': 'Usulután Norte',       '11/24': 'Usulután Sur',

  // ── San Miguel (12) ──────────────────────────────────────────────────────
  '12/01': 'San Miguel Central',   '12/02': 'San Miguel Norte',
  '12/03': 'San Miguel Norte',     '12/04': 'San Miguel Sur',
  '12/05': 'San Miguel Sur',       '12/06': 'San Miguel Norte',
  '12/07': 'San Miguel Sur',       '12/08': 'San Miguel Sur',
  '12/09': 'San Miguel Oeste',     '12/10': 'San Miguel Sur',
  '12/11': 'San Miguel Sur',       '12/12': 'San Miguel Norte',
  '12/13': 'San Miguel Este',      '12/14': 'San Miguel Norte',
  '12/15': 'San Miguel Norte',     '12/16': 'San Miguel Sur',
  '12/17': 'San Miguel Norte',     '12/18': 'San Miguel Sur',
  '12/19': 'San Miguel Norte',     '12/20': 'San Miguel Este',

  // ── Morazán (13) ─────────────────────────────────────────────────────────
  '13/01': 'Morazán Central',      '13/02': 'Morazán Norte',
  '13/03': 'Morazán Norte',        '13/04': 'Morazán Este',
  '13/05': 'Morazán Central',      '13/06': 'Morazán Sur',
  '13/07': 'Morazán Central',      '13/08': 'Morazán Sur',
  '13/09': 'Morazán Central',      '13/10': 'Morazán Central',
  '13/11': 'Morazán Norte',        '13/12': 'Morazán Norte',
  '13/13': 'Morazán Sur',          '13/14': 'Morazán Central',
  '13/15': 'Morazán Norte',        '13/16': 'Morazán Central',
  '13/17': 'Morazán Norte',        '13/18': 'Morazán Central',
  '13/19': 'Morazán Norte',        '13/20': 'Morazán Central',
  '13/21': 'Morazán Central',      '13/22': 'Morazán Central',
  '13/23': 'Morazán Norte',        '13/24': 'Morazán Norte',
  '13/25': 'Morazán Central',      '13/26': 'Morazán Sur',

  // ── La Unión (14) ────────────────────────────────────────────────────────
  '14/01': 'La Unión Central',     '14/02': 'La Unión Norte',
  '14/03': 'La Unión Norte',       '14/04': 'La Unión Norte',
  '14/05': 'La Unión Sur',         '14/06': 'La Unión Norte',
  '14/07': 'La Unión Norte',       '14/08': 'La Unión Sur',
  '14/09': 'La Unión Norte',       '14/10': 'La Unión Sur',
  '14/11': 'La Unión Norte',       '14/12': 'La Unión Norte',
  '14/13': 'La Unión Norte',       '14/14': 'La Unión Central',
  '14/15': 'La Unión Norte',       '14/16': 'La Unión Sur',
  '14/17': 'La Unión Sur',         '14/18': 'La Unión Sur',
}

/** Retorna la zona geográfica dado departamento y municipio */
export function getZona(departamentoCod: string, municipioCod: string): string | undefined {
  return ZONA_POR_MUNICIPIO[`${departamentoCod}/${municipioCod}`]
}
