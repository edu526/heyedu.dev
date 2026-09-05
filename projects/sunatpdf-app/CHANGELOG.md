# Changelog

Todos los cambios notables del proyecto. Formato basado en [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] - 2026-09-05

### Changed
- Re-brand visual: paleta dark `#0f0f1a` + gradiente violeta `#8b5cf6` (consistente con heyedu.dev)
- Tipografía: Inter Variable para la UI, Poppins se mantiene en el PDF
- Bug fix: pesos 700 y 800 de Poppins ahora embebidos (antes el PDF renderizaba bold con fallback)
- Layout fixed dashboard: header + sidebar + preview fijos, scroll solo en el panel/preview
- Footer reemplazado por badge "100% local · sin servidor"
- Migrado a workspace `sunatpdf-app` dentro del monorepo heyedu.dev

### Added
- Persistencia en localStorage (marca + último XML)
- Control de zoom del preview (40–150%)
- FAQ en la sidebar (acordeón con `<details>`)
- SEO completo: meta, Open Graph, Twitter cards, Schema.org `WebApplication`, `sitemap.xml`, `robots.txt`
- OG image (1200×630) + favicons PNG (apple-touch, 192, 512) generados vía `@resvg/resvg-js`
- `_headers` para Cloudflare Pages con COOP/COEP en `/sunatpdf/*`
- Tests del parser con fixture inline (14 tests, sin archivos externos)

### Removed
- Color secundario del form de marca (era código muerto)
- Logo `logo.png` por defecto (se eliminó el archivo y el fetch)
- `color2` y `--brand-2` (sin uso)
- 5 archivos de Inter static (reemplazados por Inter Variable)
- Campo `color2` del default brand

## [0.1.0] - 2026-09-04

### Added
- Conversión UBL 2.1 → PDF (boletas, facturas, notas de crédito, notas de débito)
- Detección de encoding Latin-1 / Windows-1252
- Catálogos SUNAT 06/03/07
- Personalización: logo, color, plantilla (clásica/moderna/minimalista)
- PDF vectorial vía `@imggion/html2realpdf` (Zig+WASM)
- Drag & drop + selector de archivo
- 3 plantillas con `--paper-accent` para tema minimal monocromo
