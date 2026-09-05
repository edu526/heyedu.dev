// scripts/generate-assets.mjs — genera OG image y favicons PNG desde SVG inline.
// Usa @resvg/resvg-js (Rust → WASM, no necesita Chrome).
//
// Uso: node scripts/generate-assets.mjs
// Output: public/og-image.png (1200x630), public/apple-touch-icon.png (180x180),
//         public/icon-192.png, public/icon-512.png
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const FONT = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';
const MONO = 'JetBrains Mono, Fira Code, ui-monospace, Menlo, Consolas, monospace';

const GRADIENT = `
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="75%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0f0f1a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="paperHead" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
`;

// ---------- OG image (1200 × 630) ----------
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${GRADIENT}
  <rect width="1200" height="630" fill="#0f0f1a"/>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>

  <!-- subtle grid -->
  <g stroke="#ffffff" stroke-opacity="0.025" stroke-width="1">
    ${Array.from({ length: 19 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="630"/>`).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="1200" y2="${i * 64}"/>`).join('')}
  </g>

  <!-- accent bar -->
  <rect x="80" y="100" width="6" height="90" rx="3" fill="url(#brand)"/>

  <!-- eyebrow / category -->
  <text x="110" y="160" font-family="${MONO}" font-size="22" font-weight="500" fill="#94a3b8" letter-spacing="2">
    HERRAMIENTA · SUNAT
  </text>

  <!-- title -->
  <text x="110" y="290" font-family="${FONT}" font-size="96" font-weight="800" fill="#e2e8f0" letter-spacing="-2">
    XML SUNAT
  </text>
  <text x="110" y="390" font-family="${FONT}" font-size="96" font-weight="800" fill="url(#brand)" letter-spacing="-2">
    → PDF
  </text>

  <!-- subtitle -->
  <text x="110" y="455" font-family="${FONT}" font-size="30" font-weight="500" fill="#cbd5e1">
    Convierte boletas, facturas y notas a PDF vectorial.
  </text>
  <text x="110" y="495" font-family="${FONT}" font-size="30" font-weight="500" fill="#94a3b8">
    100% local · sin servidor · sin subir archivos.
  </text>

  <!-- feature pills -->
  <g font-family="${FONT}" font-size="20" font-weight="600">
    <g transform="translate(110, 530)">
      <rect width="170" height="42" rx="21" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.5"/>
      <text x="85" y="28" text-anchor="middle" fill="#e2e8f0">100% local</text>
    </g>
    <g transform="translate(296, 530)">
      <rect width="160" height="42" rx="21" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.5"/>
      <text x="80" y="28" text-anchor="middle" fill="#e2e8f0">Sin registro</text>
    </g>
    <g transform="translate(472, 530)">
      <rect width="140" height="42" rx="21" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.5"/>
      <text x="70" y="28" text-anchor="middle" fill="#e2e8f0">Vectorial</text>
    </g>
  </g>

  <!-- PDF mockup -->
  <g transform="translate(820, 130)">
    <rect x="8" y="8" width="280" height="370" rx="8" fill="#000" fill-opacity="0.5"/>
    <rect width="280" height="370" rx="8" fill="#ffffff"/>
    <!-- header band -->
    <rect x="0" y="0" width="280" height="48" rx="8" fill="url(#paperHead)"/>
    <rect x="0" y="40" width="280" height="8" fill="url(#paperHead)"/>
    <!-- logo box -->
    <rect x="20" y="68" width="56" height="56" rx="4" fill="#e2e8f0" stroke="#e5e7eb"/>
    <text x="48" y="100" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#94a3b8">LOGO</text>
    <!-- title block -->
    <rect x="92" y="68" width="168" height="10" rx="2" fill="#1f2937"/>
    <rect x="92" y="84" width="140" height="8" rx="2" fill="#6b7280"/>
    <rect x="92" y="98" width="120" height="8" rx="2" fill="#6b7280"/>
    <!-- RUC box -->
    <rect x="20" y="140" width="240" height="50" rx="4" fill="none" stroke="#8b5cf6" stroke-width="2"/>
    <rect x="140" y="150" width="3" height="30" fill="#8b5cf6"/>
    <text x="40" y="170" font-family="${FONT}" font-size="10" font-weight="700" fill="#1f2937">BOLETA</text>
    <text x="160" y="170" font-family="${FONT}" font-size="10" font-weight="700" fill="#1f2937">EB01-1</text>
    <!-- table -->
    <rect x="20" y="210" width="240" height="20" fill="url(#paperHead)"/>
    <text x="28" y="224" font-family="${FONT}" font-size="9" font-weight="700" fill="#ffffff">CANT · UND · DESCRIPCIÓN · IMPORTE</text>
    <g fill="#374151">
      <rect x="20" y="234" width="240" height="1" fill="#e5e7eb"/>
      <rect x="20" y="240" width="100" height="6" rx="2"/>
      <rect x="200" y="240" width="60" height="6" rx="2"/>
      <rect x="20" y="252" width="240" height="1" fill="#e5e7eb"/>
      <rect x="20" y="258" width="120" height="6" rx="2"/>
      <rect x="200" y="258" width="60" height="6" rx="2"/>
      <rect x="20" y="270" width="240" height="1" fill="#e5e7eb"/>
      <rect x="20" y="276" width="80" height="6" rx="2"/>
      <rect x="200" y="276" width="60" height="6" rx="2"/>
      <rect x="20" y="288" width="240" height="1" fill="#e5e7eb"/>
    </g>
    <!-- total box -->
    <rect x="140" y="320" width="120" height="32" rx="4" fill="url(#paperHead)"/>
    <text x="280" y="340" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="800" fill="#ffffff">S/ 535.00</text>
  </g>

  <!-- footer URL -->
  <text x="110" y="615" font-family="${MONO}" font-size="20" font-weight="500" fill="#64748b">
    heyedu.dev/sunatpdf
  </text>
</svg>`;

// ---------- Favicon (32 × 32) ----------
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  ${GRADIENT}
  <rect width="32" height="32" rx="6" fill="#0f0f1a"/>
  <rect x="6" y="4" width="14" height="20" rx="2" fill="#e2e8f0"/>
  <rect x="6" y="4" width="14" height="3" fill="url(#brand)"/>
  <rect x="8" y="11" width="10" height="1.5" fill="#64748b"/>
  <rect x="8" y="14" width="8" height="1.5" fill="#64748b"/>
  <rect x="8" y="17" width="9" height="1.5" fill="#64748b"/>
  <path d="M19 22 L19 28 L24 28 L28 24 L24 24 L24 20 Z" fill="url(#brand)"/>
</svg>`;

function render(svg, width, height) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'transparent',
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  })
    .render()
    .asPng();
}

const out = {
  'public/og-image.png':          render(ogSvg, 1200, 630),
  'public/apple-touch-icon.png':  render(faviconSvg, 180, 180),
  'public/icon-192.png':          render(faviconSvg, 192, 192),
  'public/icon-512.png':          render(faviconSvg, 512, 512),
};

for (const [path, png] of Object.entries(out)) {
  writeFileSync(path, png);
  console.log(`✓ ${path} (${(png.length / 1024).toFixed(1)} KB)`);
}
