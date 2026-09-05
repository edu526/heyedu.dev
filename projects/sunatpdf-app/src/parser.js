// src/parser.js — convierte XML SUNAT UBL 2.1 a JSON normalizado para la UI/PDF.
import { XMLParser } from 'fast-xml-parser';
import { TIPO_DOC, docLabel } from './format.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  textNodeName: '#text',
});

const t = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v).trim();
  if (Array.isArray(v)) return t(v[0]);
  if (typeof v === 'object') return t(v['#text']);
  return '';
};

// ponytail: RUC/DNI vienen a veces con guiones o espacios del emisor (formato legacy)
const cleanDoc = (s) => String(s || '').replace(/[\s-]/g, '');

const num = (v) => {
  const x = parseFloat(t(v));
  return isNaN(x) ? 0 : x;
};

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

const docTipoFromId = (idNode) => {
  if (!idNode) return 'RUC';
  return docLabel(idNode['@_schemeID']);
};

/**
 * Extrae los datos relevantes de un nodo `cac:Party` UBL.
 * @param {object|null} party
 * @returns {{doc: string, docTipo: string, nombre: string, direccion: string}}
 */
function pickParty(party) {
  if (!party) return { doc: '', docTipo: 'RUC', nombre: '', direccion: '' };
  const ident = party.PartyIdentification?.ID ?? party.PartyLegalEntity?.CompanyID;
  const legal = party.PartyLegalEntity;
  const person = party.Person;
  const addr = legal?.RegistrationAddress;
  const name = t(legal?.RegistrationName)
    || [t(person?.FirstName), t(person?.FamilyName)].filter(Boolean).join(' ')
    || t(party.PartyName?.Name);
  const addressLine = addr?.AddressLine?.Line ?? addr?.AddressLine;
  const direccion = [
    t(addressLine),
    t(addr?.District),
    t(addr?.CityName),
    t(addr?.CountrySubentity),
  ].filter(Boolean).join(' - ');
  return { doc: cleanDoc(t(ident)), docTipo: docTipoFromId(ident), nombre: name, direccion };
}

/**
 * Convierte un string XML UBL 2.1 de SUNAT a un objeto JavaScript normalizado.
 *
 * Soporta: Invoice (01, 03), CreditNote (07), DebitNote (08).
 * Detecta encoding Latin-1 si el XML declara ISO-8859-1 (común en emisores SUNAT).
 *
 * @param {string} xmlText - El contenido del archivo XML como string (debe estar decodificado).
 * @returns {{
 *   tipo: string,
 *   tipoCode: string,
 *   serieNumero: string,
 *   fecha: string,
 *   moneda: string,
 *   emisor: {doc: string, docTipo: string, nombre: string, direccion: string},
 *   cliente: {doc: string, docTipo: string, nombre: string, direccion: string},
 *   items: Array<{nro, cantidad, unidad, descripcion, precio, subtotal, descuento, igvItem}>,
 *   totals: {gravada, exonerada, inafecta, isc, igv, otrosCargos, otrosTributos, redondeo},
 *   total: number,
 *   refSerie?: string,
 *   motivo?: string,
 * }}
 * @throws {Error} Si el XML no es un comprobante UBL válido.
 *
 * @example
 * const data = parseUblXml(xmlString);
 * console.log(data.emisor.nombre); // "MATICORENA VILLEGAS..."
 * console.log(data.totals.gravada); // 535.00
 */
export function parseUblXml(xmlText) {
  const obj = xmlParser.parse(xmlText);
  const root = obj.Invoice || obj.CreditNote || obj.DebitNote;
  if (!root) throw new Error('XML no es un comprobante UBL (Invoice/CreditNote/DebitNote).');

  const rootType = obj.Invoice ? 'Invoice' : obj.CreditNote ? 'CreditNote' : 'DebitNote';
  const tipoField = rootType === 'Invoice' ? 'InvoiceTypeCode'
                  : rootType === 'CreditNote' ? 'CreditNoteTypeCode'
                  : 'DebitNoteTypeCode';
  const qtyField = rootType === 'CreditNote' ? 'CreditedQuantity'
                 : rootType === 'DebitNote' ? 'DebitedQuantity'
                 : 'InvoicedQuantity';
  const lineTag = rootType === 'CreditNote' ? 'CreditNoteLine'
                : rootType === 'DebitNote' ? 'DebitNoteLine'
                : 'InvoiceLine';

  const tipoCode = t(root[tipoField]);
  const tipo = TIPO_DOC[tipoCode] || 'COMPROBANTE ELECTRÓNICO';
  const serieNumero = t(root.ID);
  const fecha = t(root.IssueDate);
  const moneda = t(root.DocumentCurrencyCode) || 'PEN';

  const emisor = pickParty(root.AccountingSupplierParty?.Party);
  const cliente = pickParty(root.AccountingCustomerParty?.Party);

  const lineNodes = arr(root[lineTag]);
  const items = lineNodes.map((ln, i) => {
    const qty = ln[qtyField];
    const tax = ln.TaxTotal;
    const taxAmount = num(tax?.TaxAmount) || arr(tax?.TaxSubtotal).reduce((s, ts) => s + num(ts.TaxAmount), 0);
    let descuento = 0;
    arr(ln.AllowanceCharge).forEach(ac => {
      if (t(ac.ChargeIndicator) === 'false') descuento += num(ac.Amount);
    });
    return {
      nro: t(ln.ID) || (i + 1),
      cantidad: num(qty) || 1,
      unidad: qty?.['@_unitCode'] || 'NIU',
      descripcion: t(ln.Item?.Description),
      precio: num(ln.Price?.PriceAmount),
      subtotal: num(ln.LineExtensionAmount),
      descuento,
      igvItem: taxAmount,
    };
  });

  // Desglose oficial de totales SUNAT
  // - gravada/exonerada/inafecta: TaxableAmount de IGV (scheme 1000) agrupado por TaxExemptionReasonCode (catálogo 07: 10=Gravada, 20=Exonerada, 30=Inafecta, 40=Exportación)
  // - isc: TaxAmount con scheme 2000
  // - igv: TaxAmount con scheme 1000
  // - otrosTributos: scheme 9999
  // - otrosCargos: AllowanceCharge raíz con ChargeIndicator=true
  const totals = { gravada: 0, exonerada: 0, inafecta: 0, isc: 0, igv: 0, otrosTributos: 0 };
  const accumulateSubtotals = (subs) => {
    arr(subs).forEach((ts) => {
      const scheme = t(ts.TaxCategory?.TaxScheme?.ID);
      const exempt = t(ts.TaxCategory?.TaxExemptionReasonCode);
      const taxable = num(ts.TaxableAmount);
      const amount = num(ts.TaxAmount);
      if (scheme === '1000') {
        if (exempt.startsWith('20')) totals.exonerada += taxable;
        else if (exempt.startsWith('30')) totals.inafecta += taxable;
        else if (exempt.startsWith('40')) totals.inafecta += taxable;
        else totals.gravada += taxable;
        totals.igv += amount;
      } else if (scheme === '2000') {
        totals.isc += amount;
      } else if (scheme === '9999') {
        totals.otrosTributos += amount;
      }
    });
  };
  arr(root.TaxTotal).forEach((tt) => accumulateSubtotals(tt.TaxSubtotal));
  lineNodes.forEach((ln) => accumulateSubtotals(ln.TaxTotal?.TaxSubtotal));

  let otrosCargos = 0;
  arr(root.AllowanceCharge).forEach((ac) => {
    if (t(ac.ChargeIndicator) === 'true') otrosCargos += num(ac.Amount);
  });

  const lmt = root.LegalMonetaryTotal;
  const total = num(lmt?.PayableAmount) || num(lmt?.TaxInclusiveAmount);
  // Monto de redondeo = total - sumatoria de bases imponibles - impuestos
  const redondeo = total - (
    totals.gravada + totals.exonerada + totals.inafecta +
    totals.isc + totals.igv + totals.otrosTributos + otrosCargos
  );

  // NC/ND: documento que modifica
  const discrepancy = root.DiscrepancyResponse;
  const refDoc = root.BillingReference?.InvoiceDocumentReference;

  return {
    tipo, tipoCode, serieNumero, fecha, moneda,
    emisor, cliente, items,
    totals: { ...totals, otrosCargos, redondeo },
    total,
    refSerie: t(refDoc?.ID),
    motivo: t(discrepancy?.Description),
  };
}
