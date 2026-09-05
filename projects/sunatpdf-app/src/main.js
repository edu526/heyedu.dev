/**
 * @file main.js — entry point: conecta UI, parser y generador PDF.
 *
 * Wiring de eventos (drag/drop, brand controls, descarga) sobre el DOM estático de index.html.
 * Estado global de la app vive en `state`; las funciones puras (parsear, renderizar, generar PDF) viven en sus módulos.
 *
 * Persistencia (localStorage):
 * - `sunat.brand.v1` — { name, color, logo, template, zoom }
 * - `sunat.lastFile.v1` — { name, size, text } del último XML cargado
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
const DEFAULT_ZOOM = 100;
const ZOOM_MIN = 40;
const ZOOM_MAX = 150;

const safeGet  = (k)     => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet  = (k, v)  => { try { localStorage.setItem(k, v); } catch {} };
const safeJSON = (k)     => { try { return JSON.parse(safeGet(k)); } catch { return null; } };

// ---------- State + DOM refs ----------
const state = {
  data: null,
  brand: { ...DEFAULT_BRAND },
  template: DEFAULT_TEMPLATE,
  zoom: DEFAULT_ZOOM,
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
  zoom: $('zoom'),
  zoomIn: $('zoomIn'),
  zoomOut: $('zoomOut'),
  zoomPct: $('zoomPct'),
};

// ---------- Persistence helpers ----------
function saveState() {
  safeSet(KEYS.brand, JSON.stringify({
    ...state.brand,
    template: state.template,
    zoom: state.zoom,
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
    state.zoom = clampZoom(b.zoom ?? DEFAULT_ZOOM);
    els.brandName.value = state.brand.name || '';
    els.brandColor.value = state.brand.color;
    els.template.value = state.template;
  }
  applyZoom();

  const f = safeJSON(KEYS.file);
  if (f?.text) {
    try {
      state.data = parseUblXml(f.text);
      state.lastFile = f;
      els.fileMeta.textContent = `${f.name} · ${(f.size / 1024).toFixed(1)} KB`;
      els.download.disabled = false;
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
      saveState();
      renderPreview(state);
    } catch (e) {
      els.fileMeta.textContent = `Error: ${e.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
}

// ---------- Zoom ----------
function clampZoom(z) { return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(z) || DEFAULT_ZOOM)); }

function applyZoom() {
  els.paper.style.setProperty('--zoom', state.zoom / 100);
  els.zoom.value = String(state.zoom);
  els.zoomPct.textContent = `${state.zoom}%`;
}

function setZoom(z) {
  state.zoom = clampZoom(z);
  applyZoom();
  saveState();
}

const onBrandChange = (mut) => { mut(); saveState(); renderPreview(state); };

els.zoom.addEventListener('input', (e) => setZoom(e.target.value));
els.zoomIn.addEventListener('click', () => setZoom(state.zoom + 10));
els.zoomOut.addEventListener('click', () => setZoom(state.zoom - 10));

// ---------- Auto-fit (mobile) ----------
// ponytail: en móvil el paper de 210mm no cabe en el viewport — calculamos el zoom
// que lo ajusta al ancho disponible y lo reaplicamos al rotar/redimensionar.
function applyFitZoom() {
  if (window.innerWidth >= 900) return;
  const previewWrap = els.paper.parentElement?.parentElement;
  if (!previewWrap) return;
  const padding = 24;
  const target = previewWrap.clientWidth - padding;
  if (target <= 0) return;
  const paperWidthPx = 210 * 96 / 25.4;
  const scale = (target / paperWidthPx) * 100;
  state.zoom = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale)));
  applyZoom();
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applyFitZoom, 100);
});

// ---------- Init ----------
restore();
renderPreview(state);
applyFitZoom();

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
els.download.addEventListener('click', async () => {
  if (!state.data) return;
  els.download.disabled = true;
  const oldText = els.download.textContent;
  els.download.textContent = 'Generando…';
  // ponytail: resetear zoom para que el PDF salga a tamaño real (210mm × 297mm)
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
    els.paper.style.setProperty('--zoom', prevZoom || String(state.zoom / 100));
    els.download.disabled = false;
    els.download.textContent = oldText;
  }
});
