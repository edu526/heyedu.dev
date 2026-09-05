/**
 * @file format.js — catálogos SUNAT y utilidades de formato (fechas, importes, números a letras).
 *
 * Módulo puro: sin imports del DOM, sin estado, sin side effects. Usado por
 * parser.js y ui.js.
 */

/** Meses del año en español (formato SUNAT: "setiembre" en lugar de "septiembre"). */
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Catálogo 06 SUNAT — Tipo de documento de identidad.
 * Mapea el `schemeID` del `cbc:ID` a su etiqueta legible.
 */
export const DOC_TIPOS = {
  '0': 'DOC.TRIB.NO.DOM.SIN.RUC',
  '1': 'DNI',
  '4': 'C.E.',
  '6': 'RUC',
  '7': 'PASAPORTE',
  'A': 'C.D.',
};

/**
 * Catálogo 03 SUNAT — Unidades de medida más usadas.
 * Mapea el `unitCode` (NIU, KGM, etc.) a su nombre en español.
 */
export const UNIDAD_CODIGOS = {
  NIU: 'unidad',
  KGM: 'kilogramo',
  GRM: 'gramo',
  TNE: 'tonelada',
  LTR: 'litro',
  GLI: 'galón',
  MTR: 'metro',
  CMT: 'centímetro',
  MTK: 'metro cuadrado',
  MTQ: 'metro cúbico',
  HUR: 'hora',
  DAY: 'día',
  MON: 'mes',
  ANN: 'año',
  PK:  'paquete',
  BX:  'caja',
  SET: 'juego',
  DZN: 'docena',
  MIL: 'millar',
  KWH: 'kilowatt hora',
  ZZ:  'servicio',
};

/**
 * Catálogo 01 SUNAT — Tipo de comprobante electrónico.
 * Mapea el `InvoiceTypeCode` (01/03/07/08) al nombre completo.
 */
export const TIPO_DOC = {
  '01': 'FACTURA ELECTRÓNICA',
  '03': 'BOLETA DE VENTA ELECTRÓNICA',
  '07': 'NOTA DE CRÉDITO ELECTRÓNICA',
  '08': 'NOTA DE DÉBITO ELECTRÓNICA',
};

/**
 * Orden y etiquetas del desglose oficial de totales SUNAT (cada tupla es [key, labelVisible]).
 * El orden sigue el formato estándar del PDF representativo.
 */
export const TOTALES_BLOQUE = [
  ['gravada',       'Op. Gravada'],
  ['exonerada',     'Op. Exonerada'],
  ['inafecta',      'Op. Inafecta'],
  ['isc',           'ISC'],
  ['igv',           'IGV'],
  ['otrosCargos',   'Otros Cargos'],
  ['otrosTributos', 'Otros Tributos'],
  ['redondeo',      'Monto de Redondeo'],
];

const SIMBOLO = { PEN: 'S/', USD: '$' };
const MONEDA_NOMBRE = { PEN: 'SOLES', USD: 'DÓLARES AMERICANOS' };

/** Símbolo monetario según código de moneda (PEN → "S/", USD → "$"). */
export const simbolo = (moneda) => SIMBOLO[moneda] || moneda;

/** Nombre largo de la moneda (PEN → "SOLES", USD → "DÓLARES AMERICANOS"). */
export const monedaNombre = (m) => MONEDA_NOMBRE[m] || m;

/**
 * Formatea un importe con separador de miles y 2 decimales en formato es-PE.
 * @param {number|string} n
 * @returns {string} ej. 1234.5 → "1,234.50"
 */
export const fmtImporte = (n) =>
  (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Convierte fecha ISO (YYYY-MM-DD) a formato largo en español.
 * @param {string} iso ej. "2026-09-04"
 * @returns {string} ej. "4 de setiembre de 2026"
 */
export const fmtFecha = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]} de ${y}`;
};

/**
 * Etiqueta legible para un schemeID del catálogo 06.
 * @param {string} schemeId ej. "6"
 * @returns {string} ej. "RUC"
 */
export const docLabel = (schemeId) =>
  DOC_TIPOS[schemeId] || (schemeId ? `DOC.${schemeId}` : 'DOC');

/**
 * Etiqueta mayúscula para un código de unidad.
 * @param {string} code ej. "NIU"
 * @returns {string} ej. "UNIDAD"
 */
export const unidadLabel = (code) => (UNIDAD_CODIGOS[code] || code || '').toUpperCase();

/**
 * Convierte hex a string "r, g, b" para usar en CSS moderno como `rgba(var(--brand-rgb), .x)`.
 * @param {string} hex ej. "#7a64a9"
 * @returns {string} ej. "122, 100, 169"
 */
export const hexToRgbStr = (hex) => {
  const h = (hex || '#000000').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return `${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)}`;
};

/**
 * Convierte un número a su representación textual en soles/dólares.
 * Ej. 535.5, "PEN" → "QUINIENTOS TREINTA Y CINCO CON 50/100 SOLES"
 * @param {number} n
 * @param {"PEN"|"USD"} [moneda="PEN"]
 * @returns {string}
 */
export function numeroALetras(n, moneda = 'PEN') {
  if (!n || isNaN(n)) return '';
  const entero = Math.floor(n);
  const cent = Math.round((n - entero) * 100);
  const m = moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES';
  return `${convertir(entero).toUpperCase()} CON ${String(cent).padStart(2, '0')}/100 ${m}`;
}

// ---------- helpers internos ----------
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function convertir(n) {
  if (n === 0) return 'cero';
  if (n === 100) return 'cien';
  let out = '';
  if (n >= 1000000) { out += convertir(Math.floor(n / 1000000)) + ' millones '; n %= 1000000; }
  if (n >= 1000) {
    const miles = Math.floor(n / 1000);
    out += (miles === 1 ? 'mil' : convertir(miles) + ' mil') + ' ';
    n %= 1000;
  }
  if (n >= 100) { out += CENTENAS[Math.floor(n / 100)] + ' '; n %= 100; }
  if (n >= 20) { out += DECENAS[Math.floor(n / 10)]; if (n % 10) out += ' y ' + UNIDADES[n % 10]; }
  else if (n > 0) out += UNIDADES[n];
  return out.trim();
}
