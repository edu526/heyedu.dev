// test/parser.test.mjs — tests del parser con node:test (built-in, sin dependencias).
// Uso: node --test test/parser.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUblXml } from '../src/parser.js';
import { numeroALetras, fmtFecha, unidadLabel, docLabel, buildQrPayload, qrSvg } from '../src/format.js';
import { makeLongInvoice } from './fixtures/long-invoice.mjs';

// Fixture mínima: boleta con 2 items, gravada=535, igv=0 (exonerada via scheme 1000 + reason 20).
// Definida como string para que el test sea 100% reproducible sin archivos externos.
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>EB01-1</cbc:ID>
  <cbc:IssueDate>2026-09-04</cbc:IssueDate>
  <cbc:InvoiceTypeCode>03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">20603396201</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>EMPRESA TEST S.A.C.</cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:CityName>LIMA</cbc:CityName>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">20123456789</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>CLIENTE TEST E.I.R.L.</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">535.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">0</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">535.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">0</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:TaxExemptionReasonCode>20</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme><cbc:ID>1000</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">16</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">80.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>ITEM TEST A</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="PEN">5.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">455.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>ITEM TEST B</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="PEN">45.50</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

const data = parseUblXml(SAMPLE_XML);

test('parsea tipo de comprobante', () => {
  assert.equal(data.tipo, 'BOLETA DE VENTA ELECTRÓNICA');
  assert.equal(data.tipoCode, '03');
});

test('extrae serie, fecha, moneda', () => {
  assert.equal(data.serieNumero, 'EB01-1');
  assert.equal(data.fecha, '2026-09-04');
  assert.equal(data.moneda, 'PEN');
});

test('emisor: nombre, RUC, dirección', () => {
  assert.equal(data.emisor.nombre, 'EMPRESA TEST S.A.C.');
  assert.equal(data.emisor.doc, '20603396201');
  assert.equal(data.emisor.docTipo, 'RUC');
  assert.equal(data.emisor.docTipoCode, '6');
  assert.equal(data.emisor.direccion, 'LIMA');
});

test('hash: sin bloque de firma, queda vacío (no revienta)', () => {
  assert.equal(data.hash, '');
});

test('cliente: nombre y RUC', () => {
  assert.equal(data.cliente.nombre, 'CLIENTE TEST E.I.R.L.');
  assert.equal(data.cliente.doc, '20123456789');
});

test('items: 2 líneas con descripciones y cantidades', () => {
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].descripcion, 'ITEM TEST A');
  assert.equal(data.items[0].cantidad, 16);
  assert.equal(data.items[0].precio, 5);
  assert.equal(data.items[0].subtotal, 80);
  assert.equal(data.items[1].descripcion, 'ITEM TEST B');
  assert.equal(data.items[1].cantidad, 10);
  assert.equal(data.items[1].subtotal, 455);
});

test('items: unidad en formato NIU', () => {
  assert.equal(data.items[0].unidad, 'NIU');
});

test('totals: exonerada=535 (scheme 1000 + reason 20), igv=0', () => {
  assert.equal(data.totals.exonerada, 535);
  assert.equal(data.totals.gravada, 0);
  assert.equal(data.totals.igv, 0);
  assert.equal(data.totals.inafecta, 0);
  assert.equal(data.totals.isc, 0);
});

test('total = suma de items', () => {
  assert.equal(data.total, 535);
});

test('XML inválido lanza error', () => {
  assert.throws(() => parseUblXml('<root><notAUBL/></root>'), /UBL/);
});

// ---------- format.js ----------

test('fmtFecha: ISO a español largo', () => {
  assert.equal(fmtFecha('2026-09-04'), '4 de setiembre de 2026');
  assert.equal(fmtFecha('invalid'), 'invalid');
  assert.equal(fmtFecha(''), '');
});

test('unidadLabel: NIU → UNIDAD, mayúscula', () => {
  assert.equal(unidadLabel('NIU'), 'UNIDAD');
  assert.equal(unidadLabel('KGM'), 'KILOGRAMO');
  assert.equal(unidadLabel('XXX'), 'XXX');
  assert.equal(unidadLabel(''), '');
});

test('docLabel: schemeID → etiqueta', () => {
  assert.equal(docLabel('6'), 'RUC');
  assert.equal(docLabel('1'), 'DNI');
  assert.equal(docLabel(''), 'DOC');
});

test('numeroALetras: casos representativos', () => {
  assert.equal(numeroALetras(535), 'QUINIENTOS TREINTA Y CINCO CON 00/100 SOLES');
  assert.equal(numeroALetras(535.5), 'QUINIENTOS TREINTA Y CINCO CON 50/100 SOLES');
  assert.equal(numeroALetras(100), 'CIEN CON 00/100 SOLES');
  assert.equal(numeroALetras(1), 'UNO CON 00/100 SOLES');
});

test('numeroALetras: USD', () => {
  assert.match(numeroALetras(100, 'USD'), /DÓLARES AMERICANOS/);
});

// ---------- long-invoice fixture (boleta larga, fuerza paginación) ----------

test('boleta larga: 60 items gravados (IGV 18%) parsea y totales cuadran', () => {
  const xml = makeLongInvoice({ items: 60, totalPerItem: 50 });
  const data = parseUblXml(xml);
  assert.equal(data.items.length, 60);
  assert.equal(data.totals.gravada, 3000);
  assert.equal(data.totals.igv, 540);
  assert.equal(data.total, 3540);
  assert.equal(data.tipoCode, '01');
  assert.equal(data.serieNumero, 'F001-999');
});

test('hash: se extrae el ds:DigestValue del bloque de firma', () => {
  const xml = makeLongInvoice({ items: 1, totalPerItem: 50 });
  const data = parseUblXml(xml);
  assert.equal(data.hash, 'PLACEHOLDER_DIGEST');
});

// ---------- código QR (format.js) ----------

test('buildQrPayload: 10 campos separados por "|" + "|" final, formato SUNAT', () => {
  const xml = makeLongInvoice({ items: 1, totalPerItem: 100, serie: 'F001', nro: '4521' });
  const data = parseUblXml(xml);
  const payload = buildQrPayload(data);
  const fields = payload.split('|');
  assert.equal(fields.length, 11); // 10 campos + '' final por el "|" de cierre
  assert.equal(fields[0], '20603396201');   // RUC emisor
  assert.equal(fields[1], '01');            // tipoCode (catálogo 01)
  assert.equal(fields[2], 'F001');          // serie
  assert.equal(fields[3], '00004521');      // correlativo (padded a 8 dígitos)
  assert.equal(fields[4], '18.00');         // IGV
  assert.equal(fields[5], '118.00');        // total
  assert.equal(fields[6], '2026-09-06');    // fecha emisión
  assert.equal(fields[7], '6');             // tipo doc receptor (catálogo 06, RUC=6)
  assert.equal(fields[8], '20123456789');   // núm. doc receptor
  assert.equal(fields[9], 'PLACEHOLDER_DIGEST'); // hash
  assert.equal(fields[10], '');             // "|" final
});

test('qrSvg: genera un <svg> vectorial válido (no imagen raster)', () => {
  const svg = qrSvg('20123456789|01|F001|00000001|18.00|118.00|2026-01-01|6|20987654321|abc|');
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 100 100"/);
  assert.match(svg, /<rect /);
});
