# sunatpdf

Convierte XMLs UBL 2.1 de SUNAT (facturas, boletas, notas de crédito y débito) a PDFs personalizables con tu marca.

100% en el navegador — el XML nunca sale del dispositivo del usuario.

Este proyecto es un workspace dentro de [heyedu.dev](../../). Se deploya en `heyedu.dev/sunatpdf/` como parte del portfolio.

![Status](https://img.shields.io/badge/status-stable-2ea44f)
![License](https://img.shields.io/badge/license-MIT-blue)

## Características

- 📄 **Drag & drop** de archivos XML — sin servidor, sin registro
- 🎨 **Personalización de marca**: logo, color primario, nombre comercial, 3 plantillas (clásica, moderna, minimalista)
- 🇵🇪 **Formato SUNAT oficial**: catálogo 06 (tipo doc), catálogo 03 (unidades), desglose completo de totales (Op. Gravada / Exonerada / Inafecta / ISC / IGV / Otros Cargos / Otros Tributos / Redondeo / Importe Total)
- 🔤 **Tipografía**: Inter Variable en la UI, Poppins (400/600/700/800) embebido en el PDF
- 📐 **PDF vectorial nativo** vía Zig+WASM (`@imggion/html2realpdf`) — texto seleccionable, buscable y copiable; ~50 KB por hoja
- 🔍 **Detección automática de encoding** (UTF-8, ISO-8859-1 → Windows-1252)
- 💰 **Conversión número a letras** en español (con `setiembre`)
- 📋 **Soporta**: Invoice (01), Boleta (03), CreditNote (07), DebitNote (08)
- 💾 **Persistencia en localStorage**: marca y último XML sobreviven al refresh
- 🔍 **Zoom** del preview 40–150%

## Stack

| Capa | Herramienta |
|---|---|
| Build | Vite + pnpm |
| XML | fast-xml-parser |
| PDF | @imggion/html2realpdf (Zig+WASM) |
| UI | Inter Variable (`@fontsource-variable/inter`) |
| PDF font | Poppins 400/600/700/800 (`@fontsource/poppins`) |
| Tests | node:test (built-in) |

## Quick start

Este proyecto se desarrolla dentro del monorepo. Todos los comandos van desde el **root**:

```bash
# Desde heyedu.dev/
pnpm install          # instala deps de todos los workspaces
pnpm dev:sunatpdf     # http://localhost:5173 — solo la SPA
pnpm build            # build completo: SPA + portfolio
pnpm test             # 14 tests del parser
pnpm assets           # regenera OG image + favicons PNG
```

Para trabajar aislado (sin el portfolio):

```bash
cd projects/sunatpdf-app
pnpm install
pnpm dev
```

## Estructura

```
sunatpdf-app/
├── index.html              # entry HTML (Vite)
├── vite.config.js          # build config + headers COOP/COEP
├── package.json
├── public/                 # assets estáticos que van al dist
│   ├── favicon.svg
│   ├── og-image.png        # 1200×630
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
├── src/
│   ├── main.js             # entry: drag/drop, brand, descarga, persistencia
│   ├── parser.js           # XML UBL → JSON normalizado
│   ├── ui.js               # preview HTML
│   ├── pdf.js              # renderPdf() wrapper
│   ├── format.js           # catálogos SUNAT + utilidades
│   └── styles.css          # estilos app + paper
├── test/
│   └── parser.test.mjs     # 14 tests con fixture inline
├── scripts/
│   └── generate-assets.mjs # regenera OG + favicons desde SVG
├── docs/
│   └── ARCHITECTURE.md     # decisiones técnicas
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## API

```js
import { parseUblXml } from './src/parser.js';
const data = parseUblXml(xmlText);
// → { tipo, serieNumero, fecha, emisor, cliente, items, totals, total }

import { renderPreview } from './src/ui.js';
renderPreview({ data, brand, template });

import { buildPdf } from './src/pdf.js';
const pdf = await buildPdf(element);
pdf.download('EB01-1.pdf');
```

Ver JSDoc completo en cada módulo.

## Deploy

El bundle se copia automáticamente al portfolio durante el build del monorepo:

```
pnpm build   →  projects/sunatpdf-app/dist/  →  public/sunatpdf/  →  dist/sunatpdf/
```

Los headers `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp` (necesarios para SharedArrayBuffer / WASM) están en `../../public/_headers` y se aplican solo a `/sunatpdf/*`.

## Roadmap

- [ ] Batch de varios XMLs → ZIP de PDFs
- [ ] Tests con XMLs reales de distintos emisores
- [ ] CI con GitHub Actions (build + lint + test)
- [ ] Soporte para facturas con detracciones / percepciones

## Limitaciones

- El parser usa namespace UBL estándar de SUNAT. XMLs con namespaces personalizados pueden no parsear.
- html2realpdf está en 0.x — revisar breaking changes antes de actualizar.

## Licencia

MIT — ver [LICENSE](./LICENSE).

---

Detalles técnicos en [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
