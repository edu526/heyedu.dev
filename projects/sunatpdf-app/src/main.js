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
 * Zoom: nativo del navegador (Ctrl+/- / pinch). El preview se auto-ajusta al ancho en móvil
 * vía `transform: scale()` para que entre en pantalla, pero no hay controles ni estado persistido.
 */
import '@fontsource-variable/inter';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

import { parseUblXml } from './parser.js';
import { buildPdf } from './pdf.js';
import { renderPreview } from './ui.js';

const $ = (id) => document.getElementById(id);

// ---------- Storage ----------
const KEYS = { brand: 'sunat.brand.v1', file: 'sunat.lastFile.v1' };
const DEFAULT_BRAND = { name: '', color: '#8b5cf6', logo: '' };
const DEFAULT_TEMPLATE = 'classic';

const safeGet  = (k)     => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet  = (k, v)  => { try { localStorage.setItem(k, v); } catch {} };
const safeJSON = (k)     => { try { return JSON.parse(safeGet(k)); } catch { return null; } };

// ---------- State + DOM refs ----------
const state = {
  data: null,
  brand: { ...DEFAULT_BRAND },
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
  template: $('template'),
  reset: $('reset'),
  paper: $('paper'),
  download: $('download'),
  downloadMobile: $('download-mobile'),
};

// ---------- Persistence helpers ----------
function saveState() {
  safeSet(KEYS.brand, JSON.stringify({
    ...state.brand,
    template: state.template,
  }));
  if (state.lastFile) {
    safeSet(KEYS.file, JSON.stringify(state.lastFile));
  }
}

function restore() {
  const b = safeJSON(KEYS.brand);
  if (b) {
    state.brand = { ...DEFAULT_BRAND, ...b };
    state.template = b.template || DEFAULT_TEMPLATE;
    els.brandName.value = state.brand.name || '';
    els.brandColor.value = state.brand.color;
    els.template.value = state.template;
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
    } catch (e) {
      els.fileMeta.textContent = `Error: ${e.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
}

const onBrandChange = (mut) => { mut(); saveState(); renderPreview(state); };

// ---------- Auto-fit (mobile only) ----------
// ponytail: en móvil el paper de 210mm no cabe en el viewport — escalamos al ancho disponible.
// No es un control, sólo sizing inicial: el usuario usa Ctrl+/- / pinch del navegador para ajustar.
function fitPaperToFrame() {
  if (window.innerWidth >= 900) return;
  const previewWrap = els.paper.parentElement?.parentElement;
  if (!previewWrap) return;
  const padding = 24;
  const target = previewWrap.clientWidth - padding;
  if (target <= 0) return;
  const paperWidthPx = 210 * 96 / 25.4;
  const scale = Math.max(0.4, Math.min(1.5, target / paperWidthPx));
  els.paper.style.setProperty('--zoom', String(scale));
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitPaperToFrame, 100);
});

// ---------- Native zoom (scoped al paper) ----------
// ponytail: el viewport meta bloquea el pinch/zoom nativo del navegador (user-scalable=no, maximum-scale=1).
// Nuestro handler es la única fuente de zoom — Ctrl+scroll, pinch, Ctrl +/- — aplicado via --zoom al paper.
// El topbar, sidebar, tab-bar y CTA quedan intactos al hacer zoom.
function applyZoomDelta(factor) {
  const current = parseFloat(getComputedStyle(els.paper).getPropertyValue('--zoom')) || 1;
  const next = Math.max(0.4, Math.min(1.5, current * factor));
  els.paper.style.setProperty('--zoom', String(next));
}

// Ctrl + scroll / trackpad pinch (desktop): zoom del paper
document.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  e.preventDefault();
  applyZoomDelta(e.deltaY > 0 ? 0.92 : 1.08);
}, { passive: false });

// Pinch (mobile): dos dedos en cualquier parte escalan el paper
let pinchStartDist = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    pinchStartDist = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2 || pinchStartDist === 0) return;
  const dist = Math.hypot(
    e.touches[0].pageX - e.touches[1].pageX,
    e.touches[0].pageY - e.touches[1].pageY
  );
  const ratio = dist / pinchStartDist;
  if (Math.abs(ratio - 1) > 0.02) e.preventDefault();
  applyZoomDelta(ratio);
  pinchStartDist = dist;
}, { passive: false });

document.addEventListener('touchend', () => {
  pinchStartDist = 0;
});

// Ctrl + ( +/- / 0 ): atajo de teclado, salvo cuando se escribe en un input
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); applyZoomDelta(1.1); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); applyZoomDelta(0.9); }
  else if (e.key === '0') { e.preventDefault(); els.paper.style.setProperty('--zoom', '1'); }
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
  // ponytail: re-fit al entrar al preview porque el panel acaba de aparecer y su ancho puede haber cambiado
  if (target === 'preview') fitPaperToFrame();
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

// ---------- Init ----------
restore();
renderPreview(state);
fitPaperToFrame();

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
els.brandLogo.addEventListener('change', (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => onBrandChange(() => { state.brand.logo = r.result; });
  r.readAsDataURL(f);
});
els.template.addEventListener('change', (e) => onBrandChange(() => { state.template = e.target.value; }));
els.reset.addEventListener('click', () => {
  state.brand = { ...DEFAULT_BRAND };
  els.brandName.value = '';
  els.brandColor.value = DEFAULT_BRAND.color;
  els.brandLogo.value = '';
  saveState();
  renderPreview(state);
});

// ---------- Download PDF ----------
async function handleDownload() {
  if (!state.data) return;
  els.download.disabled = true;
  els.downloadMobile.disabled = true;
  els.download.textContent = 'Generando…';
  els.downloadMobile.textContent = 'Generando…';
  // ponytail: resetear escala para que el PDF salga a tamaño A4 real (210mm × 297mm)
  const prevZoom = els.paper.style.getPropertyValue('--zoom');
  els.paper.style.setProperty('--zoom', '1');
  try {
    await document.fonts.ready;
    const pdf = await buildPdf(els.paper);
    pdf.download(`${state.data.serieNumero || 'comprobante'}.pdf`);
  } catch (e) {
    alert('Error generando PDF: ' + e.message);
    console.error(e);
  } finally {
    els.paper.style.setProperty('--zoom', prevZoom);
    els.download.disabled = false;
    els.downloadMobile.disabled = false;
    els.download.textContent = 'Descargar PDF';
    els.downloadMobile.textContent = 'Descargar PDF';
  }
}
els.download.addEventListener('click', handleDownload);
els.downloadMobile.addEventListener('click', handleDownload);
