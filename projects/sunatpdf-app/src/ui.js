/**
 * @file ui.js — renderiza el comprobante como HTML en el elemento #paper.
 * Es la misma estructura que captura @imggion/html2realpdf para el PDF.
 */
import { fmtImporte, fmtFecha, simbolo, monedaNombre, numeroALetras, unidadLabel, TOTALES_BLOQUE, hexToRgbStr } from './format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const $ = (id) => document.getElementById(id);

/**
 * Renderiza el comprobante en el elemento `#paper` con los datos parseados del XML
 * y la configuración de marca del usuario.
 *
 * @param {{data: object, brand: {name: string, color: string, logo: string}, template: string}} state
 * @returns {void}
 */
export function renderPreview(state) {
  const { data, brand, template } = state;
  if (!data) return;
  const paper = $('paper');
  paper.style.setProperty('--brand', brand.color);
  paper.style.setProperty('--brand-rgb', hexToRgbStr(brand.color));
  paper.className = `paper template-${template}`;

  const sim = simbolo(data.moneda);
  const logoHtml = brand.logo
    ? `<img class="logo" src="${brand.logo}" alt="logo">`
    : `<div class="logo logo-placeholder">LOGO</div>`;

  // Bloque SUNAT de cliente: label : value apilados
  const partyRows = [
    ['Fecha de Vencimiento', ''],
    ['Fecha de Emisión',     fmtFecha(data.fecha)],
    ['Señor(es)',            data.cliente.nombre || '-'],
    [data.cliente.docTipo,   data.cliente.doc || '-'],
    ['Tipo de Moneda',       monedaNombre(data.moneda)],
    ['Observación',          ''],
  ].map(([k, v]) => `<div class="party-row"><span class="party-k">${esc(k)}</span><span class="party-sep">:</span><span class="party-v">${esc(v)}</span></div>`).join('');

  const totalRows = TOTALES_BLOQUE.map(([key, label]) =>
    `<tr><td>${esc(label)}</td><td class="num">${sim} ${fmtImporte(data.totals[key] || 0)}</td></tr>`
  ).join('');

  paper.innerHTML = `
    <div class="header">
      <div style="display:flex;gap:14px;align-items:flex-start;flex:1;min-width:0">
        ${logoHtml}
        <div class="emitter">
          ${brand.name ? `<div style="font-weight:600;font-size:11px;color:var(--paper-accent)">${esc(brand.name)}</div>` : ''}
          <div class="razon">${esc(data.emisor.nombre || '-')}</div>
          <div class="meta">
            <div>${esc(data.emisor.direccion)}</div>
          </div>
        </div>
      </div>
      <div class="doc">
        <div class="type">${esc(data.tipo.replace(/\.$/, ''))}.</div>
        <div class="ruc">${esc(data.emisor.docTipo)}: ${esc(data.emisor.doc)}</div>
        <div class="num">${esc(data.serieNumero)}</div>
      </div>
    </div>

    <div class="party-block">${partyRows}</div>

    ${(data.refSerie || data.motivo) ? `
      <div class="party-block" style="margin-top:6px">
        <div class="party-row"><span class="party-k">Comprobante que modifica</span><span class="party-sep">:</span><span class="party-v">${esc(data.refSerie || '-')}</span></div>
        <div class="party-row"><span class="party-k">Motivo</span><span class="party-sep">:</span><span class="party-v">${esc(data.motivo || '-')}</span></div>
      </div>` : ''}

    <table style="margin-top:14px" class="items-table">
      <thead><tr>
        <th style="width:14mm;white-space:nowrap">Cantidad</th>
        <th style="width:24mm;white-space:nowrap">Unidad Medida</th>
        <th>Descripción</th>
        <th class="num" style="width:22mm;white-space:nowrap">Valor Unit.<sup>(*)</sup></th>
        <th class="num" style="width:20mm;white-space:nowrap">Descuento<sup>(*)</sup></th>
        <th class="num" style="width:38mm;white-space:nowrap">Importe de Venta<sup>(**)</sup></th>
      </tr></thead>
      <tbody>
        ${data.items.map(it => `
          <tr>
            <td>${fmtImporte(it.cantidad)}</td>
            <td>${esc(unidadLabel(it.unidad))}</td>
            <td>${esc(it.descripcion)}</td>
            <td class="num">${fmtImporte(it.precio)}</td>
            <td class="num">${fmtImporte(it.descuento)}</td>
            <td class="num">${fmtImporte(it.subtotal)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footnotes">
      <div><sup>(*)</sup> Sin Impuestos.</div>
      <div><sup>(**)</sup> Incluye impuestos, de ser Op. Gravada.</div>
    </div>

    <div class="totals">
      <table class="totals-table">
        <tbody>${totalRows}</tbody>
      </table>
      <div class="grand-box">
        <div class="lbl">Importe Total</div>
        <div class="amt">${sim} ${fmtImporte(data.total)}</div>
      </div>
    </div>

    <div class="letras"><b>SON:</b> ${esc(numeroALetras(data.total, data.moneda))}</div>

    <div class="footer-note">
      Esta es una representación impresa de ${esc(data.tipo.toLowerCase().replace(/\.$/, ''))}, generada en el Sistema de la SUNAT. El Emisor Electrónico puede verificarla utilizando su clave SOL, el Adquirente o Usuario puede consultar su validez en SUNAT Virtual: <b>www.sunat.gob.pe</b>, en Opciones sin Clave SOL / Consulta de Validez del CPE.
    </div>
  `;
}
