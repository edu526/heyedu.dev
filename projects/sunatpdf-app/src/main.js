/**
 * @file main.js — entry point: conecta UI, parser y generador PDF.
 *
 * Wiring de eventos (drag/drop, brand controls, descarga) sobre el DOM estático de index.html.
 * Estado global de la app vive en `state`; las funciones puras (parsear, renderizar, generar PDF) viven en sus módulos.
 *
 * Persistencia (localStorage):
 * - `sunat.brand.v1` — { name, color, logo, template }
 * - `sunat.lastFile.v1` — { name, size, text } del último XML cargado
 *
 * Vista previa: lo que el usuario ve es siempre el PDF real, generado con
 * `@imggion/html2realpdf` y mostrado vía `pdf.preview()` (paginación y zoom nativos de la
 * librería). `#paper` sigue existiendo pero fuera de pantalla (`.render-source`, ver
 * styles.css) — es solo la fuente de layout que consume `buildPdf()`, nunca se muestra.
 */
import '@fontsource-variable/inter';

import { parseUblXml } from './parser.js';
import { buildPdf } from './pdf.js';
import { renderPreview } from './ui.js';

const $ = (id) => document.getElementById(id);

// ---------- Storage ----------
const KEYS = { brand: 'sunat.brand.v1', file: 'sunat.lastFile.v1' };
const DEFAULT_BRAND = { name: '', color: '#8b5cf6', logo: '' };
const DEFAULT_CONTACT = {
  wallet1Label: '', wallet1Number: '', wallet2Label: '', wallet2Number: '',
  whatsapp: '', instagram: '', facebook: '',
  banks: '',
};
const DEFAULT_TEMPLATE = 'ledger';

const safeGet  = (k)     => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet  = (k, v)  => { try { localStorage.setItem(k, v); } catch {} };
const safeJSON = (k)     => { try { return JSON.parse(safeGet(k)); } catch { return null; } };

// ---------- State + DOM refs ----------
const state = {
  data: null,
  brand: { ...DEFAULT_BRAND },
  contact: { ...DEFAULT_CONTACT },
  template: DEFAULT_TEMPLATE,
  lastFile: null,
};

const els = {
  drop: $('drop'),
  file: $('file'),
  fileMeta: $('fileMeta'),
  brandName: $('brandName'),
  brandColor: $('brandColor'),
  brandLogo: $('brandLogo'),
  uploadLogo: $('uploadLogo'),
  template: $('template'),
  contactWallet1Label: $('contactWallet1Label'),
  contactWallet1Number: $('contactWallet1Number'),
  contactWallet2Label: $('contactWallet2Label'),
  contactWallet2Number: $('contactWallet2Number'),
  contactWhatsapp: $('contactWhatsapp'),
  contactInstagram: $('contactInstagram'),
  contactFacebook: $('contactFacebook'),
  contactBanks: $('contactBanks'),
  reset: $('reset'),
  paper: $('paper'),
  download: $('download'),
  downloadMobile: $('download-mobile'),
  pdfPreview: $('pdfPreview'),
  pdfPreviewHint: $('pdfPreviewHint'),
};

// ---------- Persistence helpers ----------
function saveState() {
  safeSet(KEYS.brand, JSON.stringify({
    ...state.brand,
    template: state.template,
    contact: state.contact,
  }));
  if (state.lastFile) {
    safeSet(KEYS.file, JSON.stringify(state.lastFile));
  }
}

// ponytail: migración de nombres de plantilla viejos (classic/modern/minimal) a los 3
// diseños reales actuales — sin esto, un usuario con localStorage previo vería el <select>
// en blanco (un value sin <option> no selecciona nada).
const TEMPLATE_MIGRATION = { classic: 'ledger', modern: 'grid', minimal: 'denso' };

function restore() {
  const b = safeJSON(KEYS.brand);
  if (b) {
    state.brand = { ...DEFAULT_BRAND, ...b };
    state.template = TEMPLATE_MIGRATION[b.template] || b.template || DEFAULT_TEMPLATE;
    state.contact = { ...DEFAULT_CONTACT, ...(b.contact || {}) };
    // ponytail: migración del campo viejo "Yape/Plin (número)" único + QR de billetera (ver
    // ARCHITECTURE.md) — se quita la imagen (por espacio en el PDF), pero recuperamos el
    // número ya cargado como "Billetera 1" para que no se pierda silenciosamente.
    if (b.contact?.yape && !state.contact.wallet1Number) {
      state.contact.wallet1Label = 'Yape/Plin';
      state.contact.wallet1Number = b.contact.yape;
    }
    els.brandName.value = state.brand.name || '';
    els.brandColor.value = state.brand.color;
    els.template.value = state.template;
    els.contactWallet1Label.value = state.contact.wallet1Label || '';
    els.contactWallet1Number.value = state.contact.wallet1Number || '';
    els.contactWallet2Label.value = state.contact.wallet2Label || '';
    els.contactWallet2Number.value = state.contact.wallet2Number || '';
    els.contactWhatsapp.value = state.contact.whatsapp || '';
    els.contactInstagram.value = state.contact.instagram || '';
    els.contactFacebook.value = state.contact.facebook || '';
    els.contactBanks.value = state.contact.banks || '';
    if (state.brand.logo) logoUp.setLoaded('Logo cargado');
  }

  const f = safeJSON(KEYS.file);
  if (f?.text) {
    try {
      state.data = parseUblXml(f.text);
      state.lastFile = f;
      els.fileMeta.textContent = `${f.name} · ${(f.size / 1024).toFixed(1)} KB`;
      els.download.disabled = false;
      els.downloadMobile.disabled = false;
    } catch {
      localStorage.removeItem(KEYS.file);
    }
  }
}

// ---------- File loading ----------
function detectEncoding(bytes) {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 200));
  const m = head.match(/encoding=["']([^"']+)/i);
  if (!m) return 'utf-8';
  return m[1].toLowerCase().replace('iso-8859-1', 'windows-1252');
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const bytes = new Uint8Array(reader.result);
      const text = new TextDecoder(detectEncoding(bytes)).decode(bytes);
      state.data = parseUblXml(text);
      state.lastFile = { name: file.name, size: file.size, text };
      els.fileMeta.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
      els.download.disabled = false;
      els.downloadMobile.disabled = false;
      saveState();
      renderPreview(state);
      scheduleRealPreview();
    } catch (e) {
      els.fileMeta.textContent = `Error: ${e.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
}

const onBrandChange = (mut) => { mut(); saveState(); renderPreview(state); scheduleRealPreview(); };

// ponytail: el <input type="file"> nativo se ve feo y rompe el dark UI — botón custom con icono
// dispara el filechoer al hacer click. Devuelve {setLoaded, setEmpty} para restaurar / reset.
// ponytail: sin tope, un logo pesado infla el localStorage y el PDF (va como base64 embebido).
// 500KB alcanza de sobra para un PNG/JPG ya comprimido.
const MAX_IMAGE_BYTES = 500 * 1024;

function setupUploader(btn, input, onFile) {
  const label = btn.querySelector('.upload-label');
  const idleText = label.textContent;
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) { setEmpty(); return; }
    if (f.size > MAX_IMAGE_BYTES) {
      alert(`La imagen pesa ${(f.size / 1024).toFixed(0)} KB — el máximo es ${MAX_IMAGE_BYTES / 1024} KB. Comprimila y volvé a intentar.`);
      setEmpty();
      return;
    }
    setLoaded(f.name);
    onFile(f);
  });
  function setLoaded(text) { btn.classList.add('has-file'); label.textContent = text; }
  function setEmpty()      { btn.classList.remove('has-file'); label.textContent = idleText; input.value = ''; }
  return { setLoaded, setEmpty };
}

const logoUp = setupUploader(els.uploadLogo, els.brandLogo, (f) => {
  const r = new FileReader();
  r.onload = () => onBrandChange(() => { state.brand.logo = r.result; });
  r.readAsDataURL(f);
});

// ---------- Tabs (mobile) ----------
const layoutEl = document.querySelector('.layout');
function setActiveTab(target) {
  layoutEl.dataset.activeTab = target;
  document.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.tab === target;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  // ponytail: al entrar al preview re-renderizo porque el panel antes estaba display:none
  // → #paper tenía 0 dimensiones y el split iterativo de ui.js bail inmediatamente.
  if (target === 'preview') {
    renderPreview(state);
    renderRealPreview(); // inmediato, no hace falta esperar el debounce al recién entrar
  }
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

// ---------- Vista previa (PDF real) ----------
// ponytail: el único preview visible es el PDF real (mismo pipeline que "Descargar"), mostrado
// con `pdf.preview()` (Shadow DOM + canvas nativo de html2realpdf, con su propio toolbar de
// paginación/zoom) — así no mantenemos dos vistas (una en vivo aproximada + la real) que puedan
// divergir. Se regenera con debounce mientras el usuario edita.
let realPdf = null;
let realPreview = null;
let realDebounceTimer = null;
let realRenderToken = 0;
const REAL_PREVIEW_DEBOUNCE_MS = 500;

// ponytail: `initialScale:'fit-width'` nativo de pdf.preview() tiene un bug — mide el ancho
// disponible SIN descontar la scrollbar vertical interna que él mismo termina mostrando (la
// hoja A4 casi siempre es más alta que el contenedor), así que el resultado queda unos ~20px
// más ancho de lo que en realidad entra y aparece scroll horizontal también. Confirmado
// empíricamente comparando varios `initialScale` numéricos vs el string 'fit-width': con un
// valor numérico que apunte al mismo ancho pero restando ese colchón, no pasa. Por eso acá NO
// usamos el string — calculamos el "ajustar al ancho" nosotros mismos.
// 595.28 = ancho de A4 en puntos PDF (210mm), la unidad nativa de `pdf.preview()` — a
// "100%" el canvas dibuja 1px por punto (deducido empíricamente: con `padding` default de
// 28px, un host de 992px de ancho encaja al 157%, y 157% × X = 992 - 2×28 despeja X ≈ 595).
const A4_WIDTH_PT = 595.28;
const PREVIEW_PADDING = 28; // debe coincidir con el default de la librería para que el cálculo cuadre
const PREVIEW_SCROLLBAR_BUFFER = 20;
// ponytail: el 3 (300%) por defecto de la librería alcanza para paneles angostos, pero en
// monitores anchos/4K el ancho disponible del panel de preview supera 3×595pt y el fit-width
// quedaba topeado ahí — la hoja dejaba franjas grises a los costados en vez de llenar el panel.
// Subimos el techo y se lo pasamos explícito a `pdf.preview()` (ver abajo) para que no vuelva
// a clampear internamente a su propio default.
const PREVIEW_MAX_SCALE = 8;

function computeFitWidthScale(containerWidth) {
  if (!containerWidth) return 1;
  const available = containerWidth - PREVIEW_PADDING * 2 - PREVIEW_SCROLLBAR_BUFFER;
  return Math.max(0.25, Math.min(PREVIEW_MAX_SCALE, available / A4_WIDTH_PT));
}

function clearRealPreview() {
  if (realPreview) { realPreview.dispose(); realPreview = null; }
  if (realPdf) { realPdf.dispose(); realPdf = null; }
}

function setPdfHint(text) {
  els.pdfPreviewHint.hidden = !text;
  els.pdfPreviewHint.textContent = text || '';
}

async function renderRealPreview() {
  if (!state.data) {
    clearRealPreview();
    setPdfHint('Sube un XML para ver el PDF.');
    return;
  }
  const token = ++realRenderToken;
  setPdfHint('Generando…');
  try {
    await document.fonts.ready;
    const pdf = await buildPdf(els.paper);
    if (token !== realRenderToken) { pdf.dispose(); return; } // superado por una regeneración más nueva
    clearRealPreview();
    realPdf = pdf;
    setPdfHint('');
    const scale = computeFitWidthScale(els.pdfPreview.clientWidth);
    // ponytail: pasamos `padding` explícito (en vez de dejar el default de la librería, que
    // cambia solo a 16 en pantallas angostas) para que siempre coincida con lo que asume
    // computeFitWidthScale() — si no, en mobile el cálculo quedaría corto o largo sin avisar.
    realPreview = await pdf.preview(els.pdfPreview, {
      initialScale: scale,
      padding: PREVIEW_PADDING,
      maxScale: PREVIEW_MAX_SCALE,
    });
  } catch (e) {
    console.error(e);
    setPdfHint('Error generando el PDF: ' + e.message);
  }
}

function scheduleRealPreview() {
  clearTimeout(realDebounceTimer);
  realDebounceTimer = setTimeout(renderRealPreview, REAL_PREVIEW_DEBOUNCE_MS);
}

// ponytail: al cambiar de ancho (resize de ventana, o el split mobile/desktop) reajustamos el
// zoom con `setScale()` — no hace falta rebuildear el PDF entero, `setScale` solo re-renderiza
// los canvas a la nueva escala (mucho más barato que `buildPdf()` + `preview()` de nuevo).
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!realPreview) return;
    realPreview.setScale(computeFitWidthScale(els.pdfPreview.clientWidth));
  }, 200);
});

// ---------- Init ----------
restore();
renderPreview(state);
renderRealPreview();

// ponytail: si hay un XML restaurado en móvil, salta directo al preview para que el usuario vea su PDF sin tocar nada
if (state.data && window.innerWidth < 900) {
  setActiveTab('preview');
}

// ---------- Drag & drop ----------
els.drop.addEventListener('click', () => els.file.click());
els.drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') els.file.click(); });
['dragenter', 'dragover'].forEach(e =>
  els.drop.addEventListener(e, (ev) => { ev.preventDefault(); els.drop.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(e =>
  els.drop.addEventListener(e, (ev) => { ev.preventDefault(); els.drop.classList.remove('dragover'); }));
els.drop.addEventListener('drop', (ev) => {
  const f = ev.dataTransfer?.files?.[0];
  if (f) loadFile(f);
});
els.file.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (f) loadFile(f);
});

// ---------- Brand controls ----------
els.brandName.addEventListener('input', (e) => onBrandChange(() => { state.brand.name = e.target.value; }));
els.brandColor.addEventListener('input', (e) => onBrandChange(() => { state.brand.color = e.target.value; }));
els.template.addEventListener('change', (e) => onBrandChange(() => { state.template = e.target.value; }));

els.contactWallet1Label.addEventListener('input', (e) => onBrandChange(() => { state.contact.wallet1Label = e.target.value; }));
els.contactWallet1Number.addEventListener('input', (e) => onBrandChange(() => { state.contact.wallet1Number = e.target.value; }));
els.contactWallet2Label.addEventListener('input', (e) => onBrandChange(() => { state.contact.wallet2Label = e.target.value; }));
els.contactWallet2Number.addEventListener('input', (e) => onBrandChange(() => { state.contact.wallet2Number = e.target.value; }));
els.contactWhatsapp.addEventListener('input', (e) => onBrandChange(() => { state.contact.whatsapp = e.target.value; }));
els.contactInstagram.addEventListener('input', (e) => onBrandChange(() => { state.contact.instagram = e.target.value; }));
els.contactFacebook.addEventListener('input', (e) => onBrandChange(() => { state.contact.facebook = e.target.value; }));
els.contactBanks.addEventListener('input', (e) => onBrandChange(() => { state.contact.banks = e.target.value; }));

els.reset.addEventListener('click', () => {
  state.brand = { ...DEFAULT_BRAND };
  state.contact = { ...DEFAULT_CONTACT };
  els.brandName.value = '';
  els.brandColor.value = DEFAULT_BRAND.color;
  logoUp.setEmpty();
  els.contactWallet1Label.value = '';
  els.contactWallet1Number.value = '';
  els.contactWallet2Label.value = '';
  els.contactWallet2Number.value = '';
  els.contactWhatsapp.value = '';
  els.contactInstagram.value = '';
  els.contactFacebook.value = '';
  els.contactBanks.value = '';
  saveState();
  renderPreview(state);
  scheduleRealPreview();
});

// ---------- Download PDF ----------
async function handleDownload() {
  if (!state.data) return;
  els.download.disabled = true;
  els.downloadMobile.disabled = true;
  els.download.textContent = 'Generando…';
  els.downloadMobile.textContent = 'Generando…';
  try {
    await document.fonts.ready;
    const pdf = await buildPdf(els.paper);
    pdf.download(`${state.data.serieNumero || 'comprobante'}.pdf`);
    const done = `✓ ${pdf.pageCount} página${pdf.pageCount === 1 ? '' : 's'}`;
    els.download.textContent = done;
    els.downloadMobile.textContent = done;
    pdf.dispose();
    setTimeout(() => {
      els.download.textContent = 'Descargar PDF';
      els.downloadMobile.textContent = 'Descargar PDF';
    }, 2200);
  } catch (e) {
    alert('Error generando PDF: ' + e.message);
    console.error(e);
    els.download.textContent = 'Descargar PDF';
    els.downloadMobile.textContent = 'Descargar PDF';
  } finally {
    els.download.disabled = false;
    els.downloadMobile.disabled = false;
  }
}
els.download.addEventListener('click', handleDownload);
els.downloadMobile.addEventListener('click', handleDownload);
