# heyedu.dev — monorepo

Personal portfolio + side projects. Construido con Astro + Cloudflare Pages.

## Estructura

```
heyedu.dev/
├── package.json              ← workspace root
├── pnpm-workspace.yaml       ← declara projects/* como workspaces
├── pnpm-workspace.lock
├── astro.config.mjs
├── tsconfig.json
├── src/                      ← Astro portfolio
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── i18n/
│   └── styles/
├── public/                   ← static assets del portfolio
│   ├── _headers              ← Cloudflare Pages headers (ej: COOP/COEP para /sunatpdf/*)
│   └── favicon.*
└── projects/                 ← proyectos deployables
    └── sunatpdf-app/         ← Vite SPA: convertidor XML SUNAT → PDF
        ├── src/              ← módulos JS
        ├── public/           ← favicon, OG, icons, robots, sitemap, manifest
        ├── scripts/          ← generate-assets.mjs
        ├── test/             ← node:test
        ├── docs/             ← ARCHITECTURE.md
        ├── index.html
        └── vite.config.js
```

## Comandos

Todos los comandos se corren desde el root del repo.

```bash
pnpm install          # instala deps del portfolio + todos los workspaces
pnpm dev              # solo el portfolio (Astro)
pnpm dev:sunatpdf     # solo la SPA (Vite)
pnpm build            # SPA → public/sunatpdf/ → portfolio → dist/
pnpm build:astro      # solo el portfolio (sin la SPA)
pnpm test             # tests de la SPA
pnpm assets           # regenera OG image + favicons PNG de la SPA
```

## Deploy

Cloudflare Pages detecta el push a `main` y corre:

```
pnpm install && pnpm build
```

El output queda en `dist/` con:
- `/` → portfolio Astro
- `/sunatpdf/` → SPA embebida (build artifact de Vite)

Los headers COOP/COEP para `/sunatpdf/*` viven en `public/_headers` (Cloudflare Pages los lee automáticamente).

## Agregar un nuevo proyecto

1. Crear carpeta `projects/<nombre>/`
2. Agregar al workspace en `pnpm-workspace.yaml`
3. Si necesita headers específicos, agregar path en `public/_headers`
4. Si querés que se compile antes del portfolio, agregar al script `build` de root

## Proyectos actuales

- **`projects/sunatpdf-app/`** — convertidor XML SUNAT → PDF, 100% local
