# Arquitectura

Decisiones técnicas del proyecto y por qué se tomaron así.

## Stack

```
XML UBL ─→ fast-xml-parser ─→ JSON ─→ ui.js (preview HTML)
                                │
                                └→ pdf.js → @imggion/html2realpdf → PDF vectorial
```

## Decisiones clave

### 1. Vector PDF en vez de raster

| Aspecto | Raster (html2canvas + jsPDF) | Vector (html2realpdf) |
|---|---|---|
| Texto seleccionable | ❌ imagen | ✅ texto nativo PDF |
| Tamaño del archivo | 200-500 KB | ~50 KB |
| Calidad de zoom | pixelada | infinita |
| Fidelidad al preview | ✅ exacta | ✅ exacta (lee DOM vivo) |
| Búsqueda dentro del PDF | ❌ | ✅ |
| Tiempo de generación | rápido | ~1.5s (WASM init) |

Ganamos vectorial. La librería `@imggion/html2realpdf` usa Zig compilado a WebAssembly, lee el DOM vivo con `getBoundingClientRect`/`getComputedStyle`, decodifica WOFF2 (Poppins funciona directo desde `@fontsource`) y escribe el PDF con texto como texto, no como imagen.

### 2. `cssProfile: 'web'` en `renderPdf`

El perfil default de html2realpdf es `'document'` — perfil estricto para reportes simples (block + table). Nuestro preview usa `display: flex`, `display: grid`, `position: absolute` para el footer fijo, gaps, etc. Sin `'web'` falla con `display:flex is outside the document/report layout profile`.

Trade-off: `'web'` soporta más CSS pero el binario WASM pesa ~8 MB (descargado una sola vez y cacheado por el navegador).

### 3. `fast-xml-parser` en vez de DOM traversal manual

El XML de SUNAT es UBL 2.1 con namespaces (`urn:oasis:names:specification:ubl:schema:xsd:...`). Navegar esto con DOM manual es frágil:

```js
// XPath con .// desde un nodo contexto en Chromium a veces falla silenciosamente
// con namespaces UBL — devuelve nodos vacíos.
```

`fast-xml-parser` con `removeNSPrefix: true` nos da acceso plano:

```js
root.AccountingSupplierParty.Party.PartyLegalEntity.RegistrationName
```

El parser usa 95 líneas (vs 150+ de DOM traversal) y maneja correctamente los atributos (`@_schemeID`), CDATA y elementos repetidos.

### 4. Encoding detection

Muchos XMLs SUNAT vienen en Latin-1 (`encoding="ISO-8859-1"` en la declaración) pero `FileReader.readAsText` decodifica como UTF-8 por default → bytes como `0xD3` (Ó) se convierten en `U+FFFD` (�).

Solución: leer como `ArrayBuffer`, parsear la declaración `<?xml encoding="..."?>`, decodificar con `TextDecoder(enc)`. `iso-8859-1` lo normalizamos a `windows-1252` (que es superset, soporta todos los caracteres que usa SUNAT).

### 5. Catálogos SUNAT

Tres catálogos están hardcodeados en `format.js`:

- **Catálogo 06** — Tipo de documento (`schemeID` → `DNI`/`RUC`/`C.E.`/...)
- **Catálogo 03** — Unidad de medida (`NIU` → `UNIDAD`, `KGM` → `KILOGRAMO`, ...)
- **Catálogo 07** — Afectación IGV (`10` Gravada, `20` Exonerada, `30` Inafecta, `40` Exportación) — usado para desglosar totales

No incluimos catálogos completos (60+ unidades, 30+ tipos doc) porque las boletas típicas usan solo los más comunes. Si necesitás uno específico, agregalo a `format.js`.

### 6. Headers COOP/COEP en dev

`@imggion/html2realpdf` usa `SharedArrayBuffer` (vía WASM con pthreads). SAB requiere:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Sin estos headers el worker del WASM falla al inicializar. Configurado en `vite.config.js` para `dev` y `preview`. Para deploy ver README.md.

### 7. Sin TypeScript

El proyecto es chico (~500 LOC). Agregar TS requiere:
- tsconfig.json
- Tipos para fast-xml-parser, @imggion/html2realpdf (algunos no existen)
- Build más lento
- Onboarding más pesado

JSDoc en funciones públicas da los beneficios de tipos sin el costo. Si crece a >1000 LOC o多人, considerar TS.

## Estructura

```
src/
├── main.js       # entry: drag/drop, brand, descarga
├── parser.js     # UBL → JSON normalizado
├── ui.js         # preview HTML (idéntico a lo que el PDF captura)
├── pdf.js        # wrapper de renderPdf
├── format.js     # catálogos + utilidades (sin estado)
└── styles.css    # estilos del preview
```

`format.js` es puro (sin imports circulares, sin DOM). `parser.js` depende de `format.js`. `ui.js` depende de `format.js`. `pdf.js` depende de la librería externa. `main.js` orquesta todo.

## Modelo de datos del comprobante

```ts
{
  tipo: 'BOLETA DE VENTA ELECTRÓNICA',
  tipoCode: '03',
  serieNumero: 'EB01-1',
  fecha: '2026-09-04',
  moneda: 'PEN',

  emisor: {
    doc: '10761331669',          // limpio (sin guiones/espacios)
    docTipo: 'RUC',
    nombre: 'MATICORENA VILLEGAS CAROLINA LUCERO',
    direccion: 'JR. INCA MANCO 530 - RIMAC - LIMA - LIMA',
  },

  cliente: { doc, docTipo, nombre, direccion }, // mismo shape

  items: [
    {
      nro: '1',
      cantidad: 16,
      unidad: 'NIU',
      descripcion: 'IMPRESIÓN + ENMICADO (1 HOJA)',
      precio: 5.00,
      subtotal: 80.00,
      descuento: 0.00,
      igvItem: 0.00,
    },
    // ...
  ],

  totals: {
    gravada: 535.00,
    exonerada: 0,
    inafecta: 0,
    isc: 0,
    igv: 0,
    otrosCargos: 0,
    otrosTributos: 0,
    redondeo: 0,
  },

  total: 535.00,

  refSerie: 'EB01-1',  // solo NC/ND
  motivo: '...',       // solo NC/ND
}
```

## Por qué este parser no es "WYSIWYG" del XML

Algunos campos del XML se descartan o sintetizan:

- `Signature` → ignorado (no es visual)
- `UBLExtensions` → ignorado (metadata de firma digital)
- `Note` (importe en letras) → ignorado, se regenera desde el total con `numeroALetras`
- `TaxTotal` raíz → se redistribuye en `totals.{gravada,exonerada,...}` según catálogo 07
- Múltiples `TaxSubtotal` por línea → se acumulan en totales del documento

Razón: el PDF no es el XML — es una representación. Tiene que ser fiel a los totales pero la estructura interna del XML no es relevante para el usuario.
