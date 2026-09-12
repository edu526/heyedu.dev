/**
 * @file pdf.js — wrapper sobre @imggion/html2realpdf para generar el PDF vectorial.
 *
 * Opciones no obvias:
 * - `cssProfile: 'web'` — soporta flex/grid/positioned del preview (el perfil default
 *   'document' los rechaza).
 * - `mediaType: 'print'` — SIN esto el renderer evalúa todo en modo 'screen' (su default),
 *   así que el bloque `@media print` de styles.css (que apaga el `box-shadow` del papel y
 *   resetea backgrounds) nunca se aplicaba: el PDF salía con una sombra visible al pie de
 *   cada hoja. Con 'print' sí se aplica.
 * - `layoutContext: 'page'` — reincorpora el ancho del `#paper` (fijo en 210mm para verse
 *   como una hoja en el preview) contra el content-box real que resulta de restarle los
 *   márgenes de `@page` (ver styles.css) — si no, el papel se dibuja a 210mm completos
 *   IGNORANDO el margen, y el contenido queda pegado/recortado contra el borde físico.
 *
 * Los márgenes de cada hoja física ahora los define `@page` en styles.css, no el padding
 * de `.paper` — un padding en el elemento sólo se aplica al inicio/fin del box fragmentado
 * (primera/última hoja), no a cada hoja intermedia. `@page` sí margina cada hoja física por
 * igual, y de paso permite la numeración "Página N de M" vía `counter(page)`/`counter(pages)`
 * en un margin-box nativo (ver ARCHITECTURE.md §7).
 *
 * `createRenderer` (en vez de `renderPdf` suelto) porque ahora regeneramos el PDF real muchas
 * veces por sesión (vista previa con debounce en cada cambio, ver main.js) — reusar la misma
 * instancia evita pagar el arranque del worker/WASM en cada regeneración.
 */
import { createRenderer } from '@imggion/html2realpdf';

let rendererPromise = null;
function getRenderer() {
  if (!rendererPromise) rendererPromise = createRenderer({ execution: 'worker' });
  return rendererPromise;
}

/**
 * Renderiza un elemento HTML a un PDF vectorial.
 * El PDF resultante tiene texto seleccionable, buscable, y tipografía embebida.
 *
 * @param {HTMLElement} element - Elemento del DOM a renderizar.
 * @returns {Promise<import('@imggion/html2realpdf').PdfDocument>}
 *
 * @example
 * const paper = document.getElementById('paper');
 * const pdf = await buildPdf(paper);
 * pdf.download('EB01-1.pdf');
 * pdf.dispose();
 */
export async function buildPdf(element) {
  const renderer = await getRenderer();
  return await renderer.render(element, {
    cssProfile: 'web',
    mediaType: 'print',
    layoutContext: 'page',
  });
}
