/**
 * @file pdf.js — wrapper sobre @imggion/html2realpdf para generar el PDF vectorial.
 * Usa `cssProfile: 'web'` para soportar flex/grid/positioned del preview.
 */
import { renderPdf } from '@imggion/html2realpdf';

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
  return await renderPdf(element, { cssProfile: 'web' });
}
