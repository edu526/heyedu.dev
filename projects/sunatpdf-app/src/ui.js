/**
 * @file ui.js — renderiza el comprobante como HTML en el elemento #paper.
 * Es la misma estructura que captura @imggion/html2realpdf para el PDF.
 *
 * Multi-página: el documento es un único flujo continuo — NO se corta manualmente en
 * secciones de 297mm. @imggion/html2realpdf pagina solo, respetando `break-inside`/
 * `pdf-atomic` (ver styles.css) y repitiendo el <thead> de la tabla de items en cada
 * hoja física del PDF. Ver docs/ARCHITECTURE.md para el porqué de este approach.
 *
 * 3 plantillas (Ledger Refinado / Grid Moderno / Denso Operativo) comparten la MISMA
 * tabla de items (colgroup, thead, continuation-strip) porque ahí vive el mecanismo de
 * paginación nativa — sólo cambia su estilo vía CSS scoped (`.template-grid .items-table`,
 * etc). Lo que sí difiere por plantilla es el markup de header / bloque de datos del
 * cliente / cierre (totales + letras + pago + footer), construido por `buildHeader*`,
 * `buildInfo*` y `buildClosing*` respectivamente.
 */
import { fmtImporte, fmtFecha, simbolo, monedaNombre, numeroALetras, unidadLabel, TOTALES_BLOQUE, hexToRgbStr, buildQrPayload, qrSvg } from './format.js';

// Iconos inline (stroke-based, sin emoji) para el bloque de pago.
const ICON_WALLET = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 10.5c0-1.4 1.3-2.5 3-2.5s3 .9 3 2c0 1.3-1.3 1.8-3 2.3-1.7.5-3 1-3 2.3 0 1.1 1.3 2 3 2s3-1.1 3-2.5"/></svg>';
const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1.2-5.3a8.4 8.4 0 1 1 16.8-3.2Z"/></svg>';
const ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.6"/><path d="M15 12h3M15 15h2"/></svg>';
const ICON_BANK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 10h16M5 10v9M9 10v9M15 10v9M19 10v9M3 19h18M12 3l9 5H3z"/></svg>';
const ICON_THUMB = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h11.4a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 17 11h-4.5l.7-4.5A1.5 1.5 0 0 0 11.7 5L7 11"/></svg>';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const $ = (id) => document.getElementById(id);

/** Inicial del nombre comercial (o razón social del emisor) para el badge de logo fallback. */
const initial = (s) => (String(s || '').trim().charAt(0) || '?').toUpperCase();

/**
 * Renderiza el comprobante en el elemento `#paper` con los datos parseados del XML
 * y la configuración de marca del usuario.
 *
 * @param {{data: object, brand: {name: string, color: string, logo: string}, template: string, contact?: object}} state
 * @returns {void}
 */
export function renderPreview(state) {
  const { data, brand, template, contact = {} } = state;
  if (!data) return;
  const paper = $('paper');
  paper.style.setProperty('--brand', brand.color);
  paper.style.setProperty('--brand-rgb', hexToRgbStr(brand.color));
  paper.className = `paper template-${template}`;

  const sim = simbolo(data.moneda);
  const totalRows = TOTALES_BLOQUE.map(([key, label]) =>
    `<tr><td>${esc(label)}</td><td class="num">${sim} ${fmtImporte(data.totals[key] || 0)}</td></tr>`
  ).join('');

  const hasContact = !!(contact && (contact.wallet1Number || contact.wallet2Number || contact.whatsapp || contact.instagram || contact.facebook || contact.banks));

  // Tabla de items: IDÉNTICA en las 3 plantillas — es donde vive la paginación nativa
  // (colgroup fijo, thead que se repite). Sólo cambia su estilo por CSS (ver styles.css).
  const itemsTable = `
    <table style="margin-top:14px" class="items-table">
      <colgroup>
        <col style="width:14mm"><col style="width:24mm"><col>
        <col style="width:22mm"><col style="width:20mm"><col style="width:38mm">
      </colgroup>
      <thead>
        <tr>
          <th style="white-space:nowrap">Cantidad</th>
          <th style="white-space:nowrap">Unidad Medida</th>
          <th>Descripción</th>
          <th class="num" style="white-space:nowrap">Valor Unit.<sup>(*)</sup></th>
          <th class="num" style="white-space:nowrap">Descuento<sup>(*)</sup></th>
          <th class="num" style="white-space:nowrap">Importe de Venta<sup>(**)</sup></th>
        </tr>
      </thead>
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
  `;

  const qrCodeSvg = qrSvg(buildQrPayload(data), { size: 76 });
  const legalNote = `Esta es una representación impresa de ${esc(data.tipo.toLowerCase().replace(/\.$/, ''))}, generada en el Sistema de la SUNAT. El Emisor Electrónico puede verificarla utilizando su clave SOL, el Adquirente o Usuario puede consultar su validez en SUNAT Virtual: <b>www.sunat.gob.pe</b>, en Opciones sin Clave SOL / Consulta de Validez del CPE.`;

  const ctx = { data, brand, contact, sim, totalRows, hasContact, itemsTable, qrCodeSvg, legalNote };

  const builders = { ledger: renderLedger, grid: renderGrid, denso: renderDenso };
  const build = builders[template] || renderLedger;
  paper.innerHTML = build(ctx);
}

// ---------------------------------------------------------------------------
// Ledger Refinado — el diseño por defecto: bloque SUNAT clásico (label : valor
// apilados), tabla con header tintado, total con doble línea, payment-block en tarjeta.
// ---------------------------------------------------------------------------
function renderLedger({ data, brand, contact, sim, totalRows, hasContact, itemsTable, qrCodeSvg, legalNote }) {
  const logoHtml = brand.logo
    ? `<img class="logo" src="${brand.logo}" alt="logo">`
    : `<div class="logo logo-placeholder">LOGO</div>`;

  // ponytail: 2 columnas armadas repartiendo el array EN JS (slice), no con CSS grid
  // auto-flow — @imggion/html2realpdf no soporta bien el auto-placement de grid por
  // columna en el PDF real (ver docs/ARCHITECTURE.md §7.3). Acá el conteo es siempre
  // fijo (6 campos), por eso un split 3/3 fijo tiene sentido — a diferencia del bloque
  // de pago (abajo), que varía de 1 a 6 ítems según lo que cargó el usuario.
  const partyRowsArr = [
    ['Fecha de Vencimiento', ''],
    ['Fecha de Emisión',     fmtFecha(data.fecha)],
    ['Señor(es)',            data.cliente.nombre || '-'],
    [data.cliente.docTipo,   data.cliente.doc || '-'],
    ['Tipo de Moneda',       monedaNombre(data.moneda)],
    ['Observación',          ''],
  ].map(([k, v]) => `<div class="party-row"><span class="party-k">${esc(k)}</span><span class="party-sep">:</span><span class="party-v">${esc(v)}</span></div>`);
  const partyLeft = partyRowsArr.slice(0, 3).join('');
  const partyRight = partyRowsArr.slice(3).join('');

  const payItem = (icon, label, value, extraClass = '') => value
    ? `<div class="pay-item ${extraClass}"><div class="pay-icon">${icon}</div><div><b>${esc(label)}:</b> ${esc(value)}</div></div>`
    : '';

  // ponytail: fila que fluye y salta de línea sola (flex-wrap), no columnas fijas — con
  // 1-2 métodos de pago se ve como una sola fila; con los 6 completos, salta a 2-3 líneas
  // solo. "Cuentas bancarias" fuerza su propia línea (pay-item-full) porque su texto es
  // largo y variable, y se ve mal compartiendo fila con un chip corto.
  const paymentBlock = hasContact ? `
    <section class="payment-block">
      <div class="payment-info">
        ${payItem(ICON_WALLET, contact.wallet1Label || 'Billetera', contact.wallet1Number)}
        ${payItem(ICON_WALLET, contact.wallet2Label || 'Billetera', contact.wallet2Number)}
        ${payItem(ICON_CHAT, 'WhatsApp', contact.whatsapp)}
        ${payItem(ICON_CAMERA, 'Instagram', contact.instagram)}
        ${payItem(ICON_THUMB, 'Facebook', contact.facebook)}
        ${contact.banks ? `<div class="pay-item pay-item-full"><div class="pay-icon">${ICON_BANK}</div><div class="payment-banks"><b>Cuentas bancarias:</b> ${esc(contact.banks).replace(/\n/g, '<br>')}</div></div>` : ''}
      </div>
    </section>
  ` : '';

  return `
    <header class="header pdf-atomic">
      <div class="header-brand">
        ${logoHtml}
        <div class="emitter">
          ${brand.name ? `<div class="brand-name" style="font-weight:600;font-size:11px;color:var(--primary)">${esc(brand.name)}</div>` : ''}
          <div class="razon">${esc(data.emisor.nombre || '-')}</div>
          <div class="meta">
            <div>${esc(data.emisor.direccion)}</div>
          </div>
        </div>
      </div>
      <aside class="header-doc doc">
        <div class="type">${esc(data.tipo.replace(/\.$/, ''))}.</div>
        <div class="ruc">${esc(data.emisor.docTipo)}: ${esc(data.emisor.doc)}</div>
        <div class="num">${esc(data.serieNumero)}</div>
      </aside>
    </header>

    <section class="party-block party-grid pdf-atomic">
      <div class="party-col">${partyLeft}</div>
      <div class="party-col">${partyRight}</div>
    </section>

    ${(data.refSerie || data.motivo) ? `
      <section class="party-block pdf-atomic" style="margin-top:6px">
        <div class="party-row"><span class="party-k">Comprobante que modifica</span><span class="party-sep">:</span><span class="party-v">${esc(data.refSerie || '-')}</span></div>
        <div class="party-row"><span class="party-k">Motivo</span><span class="party-sep">:</span><span class="party-v">${esc(data.motivo || '-')}</span></div>
      </section>` : ''}

    ${itemsTable}

    <div class="totals-wrap pdf-atomic">
      <section class="totals">
        <table class="totals-table">
          <tbody>${totalRows}</tbody>
        </table>
        <div class="grand-box">
          <div class="lbl">Importe Total</div>
          <div class="amt">${sim} ${fmtImporte(data.total)}</div>
        </div>
      </section>

      <div class="letras"><b>SON:</b> ${esc(numeroALetras(data.total, data.moneda))}</div>
    </div>

    ${paymentBlock}

    <div class="footer-wrap pdf-atomic">
      <div class="qr-wrap">
        ${qrCodeSvg}
        <div class="qr-cap">Verifica aquí</div>
      </div>
      <footer class="footer-note">${legalNote}</footer>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Grid Moderno — header con logo en chip cuadrado + número grande a la derecha,
// tarjeta de datos del cliente en grid de 3 columnas, tabla con header de línea
// gruesa (sin tinte), totales en caja simple, pagos como "chips" con icono.
// ---------------------------------------------------------------------------
function renderGrid({ data, brand, contact, sim, totalRows, hasContact, itemsTable, qrCodeSvg, legalNote }) {
  // ponytail: el chip de color (fondo var(--primary)) es sólo el fallback cuando no hay logo
  // subido — un logo real se muestra sin envoltorio, igual que en Ledger (imagen neutra,
  // sin fondo forzado), para no alterar los colores/transparencia del logo del usuario.
  const miniLogo = brand.logo
    ? `<img class="gm-logo-img" src="${brand.logo}" alt="logo">`
    : `<div class="gm-logo"><span class="mini-logo-fallback">${esc(initial(brand.name || data.emisor.nombre))}</span></div>`;

  const infoCells = [
    ['Cliente', data.cliente.nombre || '-'],
    [data.cliente.docTipo, data.cliente.doc || '-'],
    ['Emisión', fmtFecha(data.fecha)],
    ['Moneda', monedaNombre(data.moneda)],
  ];
  if (data.refSerie || data.motivo) {
    infoCells.push(['Modifica a', data.refSerie || '-'], ['Motivo', data.motivo || '-']);
  }
  const gmCard = infoCells.map(([k, v]) =>
    `<div><div class="gm-card-label">${esc(k)}</div><div class="gm-card-val">${esc(v)}</div></div>`
  ).join('');

  const chip = (icon, label, value) => value
    ? `<div class="gm-chip">${icon}<span><b>${esc(label)}:</b> ${esc(value)}</span></div>` : '';
  const gmChips = [
    chip(ICON_WALLET, contact.wallet1Label || 'Billetera', contact.wallet1Number),
    chip(ICON_WALLET, contact.wallet2Label || 'Billetera', contact.wallet2Number),
    chip(ICON_CHAT, 'WhatsApp', contact.whatsapp),
    chip(ICON_CAMERA, 'Instagram', contact.instagram),
    chip(ICON_THUMB, 'Facebook', contact.facebook),
  ].join('');
  const gmBanks = contact.banks ? `<div class="gm-banks"><b>Cuentas bancarias:</b> ${esc(contact.banks).replace(/\n/g, ' &middot; ')}</div>` : '';
  const gmPayment = hasContact ? `<div class="gm-chips">${gmChips}</div>${gmBanks}` : '';

  return `
    <header class="header pdf-atomic gm-header">
      <div class="gm-brand">
        ${miniLogo}
        <div>
          ${brand.name ? `<div class="gm-brand-tag">${esc(brand.name)}</div>` : ''}
          <div class="gm-brand-name">${esc(data.emisor.nombre || '-')}</div>
          <div class="gm-brand-addr">${esc(data.emisor.direccion)}</div>
        </div>
      </div>
      <div class="gm-meta">
        <div class="gm-meta-label">${esc(data.tipo.replace(/\.$/, ''))}</div>
        <div class="gm-meta-num">${esc(data.serieNumero)}</div>
        <div class="gm-meta-ruc">${esc(data.emisor.docTipo)} ${esc(data.emisor.doc)}</div>
      </div>
    </header>

    <div class="gm-card pdf-atomic">${gmCard}</div>

    ${itemsTable}

    <div class="gm-totals-wrap pdf-atomic">
      <div class="gm-summary">
        <div class="gm-summary-box">
          <table class="gm-sum-table"><tbody>${totalRows}</tbody></table>
          <div class="gm-total"><div class="gm-total-label">Importe Total</div><div class="gm-total-amt">${sim} ${fmtImporte(data.total)}</div></div>
        </div>
      </div>

      <div class="gm-letras"><b>SON:</b> ${esc(numeroALetras(data.total, data.moneda))}</div>
    </div>

    ${gmPayment}

    <div class="gm-footer-wrap pdf-atomic">
      <div class="qr-wrap">
        ${qrCodeSvg}
        <div class="qr-cap">Verifica aquí</div>
      </div>
      <div class="gm-footer">${legalNote}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Denso Operativo — todo comprimido: header en una línea, franja de datos del
// cliente inline, tabla compacta con divisor de columna monetaria, totales y
// letras en dos columnas al pie.
// ---------------------------------------------------------------------------
function renderDenso({ data, brand, contact, sim, totalRows, hasContact, itemsTable, qrCodeSvg, legalNote }) {
  // ponytail: mismo criterio que en Grid Moderno — el chip de color es sólo el fallback
  // sin logo; un logo real se muestra sin fondo forzado, igual que en Ledger.
  const miniLogo = brand.logo
    ? `<img class="do-logo-img" src="${brand.logo}" alt="logo">`
    : `<div class="do-logo"><span class="mini-logo-fallback">${esc(initial(brand.name || data.emisor.nombre))}</span></div>`;

  const stripItems = [
    ['Cliente', data.cliente.nombre || '-'],
    [data.cliente.docTipo, data.cliente.doc || '-'],
    ['Emisión', fmtFecha(data.fecha)],
    ['Moneda', monedaNombre(data.moneda)],
  ];
  if (data.refSerie || data.motivo) {
    stripItems.push(['Modifica a', data.refSerie || '-'], ['Motivo', data.motivo || '-']);
  }
  const doStrip = stripItems.map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('');

  const doPaySpans = [
    contact.wallet1Number ? `<span><b>${esc(contact.wallet1Label || 'Billetera')}</b> ${esc(contact.wallet1Number)}</span>` : '',
    contact.wallet2Number ? `<span><b>${esc(contact.wallet2Label || 'Billetera')}</b> ${esc(contact.wallet2Number)}</span>` : '',
    contact.whatsapp ? `<span><b>WhatsApp</b> ${esc(contact.whatsapp)}</span>` : '',
    contact.instagram ? `<span><b>IG</b> ${esc(contact.instagram)}</span>` : '',
    contact.facebook ? `<span><b>FB</b> ${esc(contact.facebook)}</span>` : '',
    contact.banks ? `<span><b>Bancos:</b> ${esc(contact.banks).replace(/\n/g, ' · ')}</span>` : '',
  ].join('');

  return `
    <header class="header pdf-atomic do-header">
      <div class="do-brand">
        ${miniLogo}
        <div class="do-brand-name">${esc(data.emisor.nombre || '-')}</div>
        <div class="do-brand-ruc">${esc(data.emisor.docTipo)} ${esc(data.emisor.doc)}</div>
      </div>
      <div class="do-doc">${esc(data.tipo.replace(/\.$/, ''))} &nbsp; <b>${esc(data.serieNumero)}</b></div>
    </header>

    <div class="do-strip pdf-atomic">${doStrip}</div>

    ${itemsTable}

    <div class="do-bottom pdf-atomic">
      <div class="do-letras-pay">
        <div class="do-letras"><b>SON:</b> ${esc(numeroALetras(data.total, data.moneda))}</div>
        ${hasContact ? `<div class="do-pay">${doPaySpans}</div>` : ''}
      </div>
      <div class="do-totals">
        <table class="do-sum-table"><tbody>${totalRows}</tbody></table>
        <div class="do-grand"><span>Total</span><span>${sim} ${fmtImporte(data.total)}</span></div>
      </div>
    </div>

    <div class="do-footer-wrap pdf-atomic">
      <div class="qr-wrap">
        ${qrCodeSvg}
        <div class="qr-cap">Verifica aquí</div>
      </div>
      <div class="do-footer">${legalNote}</div>
    </div>
  `;
}
