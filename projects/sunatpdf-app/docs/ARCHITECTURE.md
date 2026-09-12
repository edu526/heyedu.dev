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

### 5.1. Código QR (RS 309-2018/SUNAT)

La representación impresa de una factura/boleta electrónica debe llevar un código QR con
10 campos separados por `|` (con un `|` final): RUC emisor, tipo de comprobante (catálogo
01), serie, correlativo (8 dígitos), IGV, importe total, fecha de emisión, tipo de
documento del adquirente (catálogo 06), número de documento del adquirente, y un hash.

El hash es el `ds:DigestValue` que ya viene dentro del `ext:UBLExtensions` del XML firmado
— lo calculó y firmó el sistema de facturación original; `parser.js` (`pickDigest`) solo lo
lee, no lo genera. `format.js` arma el string (`buildQrPayload`) y lo dibuja como SVG
vectorial (`qrSvg`, vía `qrcode.create()` en modo síncrono + `<rect>` por módulo) en vez de
una imagen raster — consistente con que todo el PDF sea vectorial (ver decisión 1).

Medidas: máx. 2cm de alto (`styles.css` lo deja exactamente en 20mm), colocado junto al
texto legal del footer.

### 6. Headers COOP/COEP en dev

`@imggion/html2realpdf` usa `SharedArrayBuffer` (vía WASM con pthreads). SAB requiere:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Sin estos headers el worker del WASM falla al inicializar. Configurado en `vite.config.js` para `dev` y `preview`. Para deploy ver README.md.

### 7. Paginación multi-hoja: un solo flujo continuo, no cortes manuales

Con boletas/facturas de muchos items, `#paper` no es una hoja A4 fija — es un único
documento HTML continuo (`min-height`, no `height`, sin `overflow: hidden`).
`@imggion/html2realpdf` pagina solo, releyendo reglas CSS de fragmentación estándar
(`break-inside`) — no hay que decirle dónde cortar hoja por hoja.

Una versión anterior intentó medir alturas con JS (`getBoundingClientRect` en un DOM
oculto) y armar N `<section class="paper">` de `height: 297mm` exactos, con
`overflow: hidden` y `margin-top: auto` para fijar el payment-block al fondo. Se
descartó: el WASM del renderer vuelve a diagramar el contenido con su propio motor de
paginación, así que esas cajas de altura fija no coinciden con sus cortes reales — el
resultado eran PDFs con el doble de hojas de las esperadas y páginas en blanco
intercaladas. La librería lo advierte explícitamente en su `SKILL.md`: no simular
páginas con alturas fijas, no usar `margin-top: auto` como mecanismo de paginación, no
poner `overflow: hidden` en contenido que puede fragmentar.

En su lugar:
- `.pdf-atomic` (`break-inside: avoid`) en los bloques que no deben cortarse a la mitad
  (header, party-block, totals, letras, payment-block, footer-note). Si un bloque no
  entra completo en el espacio restante de la hoja actual, se empuja entero a la
  siguiente.
- La tabla de items es una única `<table>` con `<colgroup>` (no una tabla por página) —
  así el ancho de columnas es idéntico en todas las hojas por construcción, no depende
  de medirlo.
- El `<thead>` de esa tabla se repite automáticamente en cada hoja física cuando
  fragmenta (comportamiento nativo del renderer) — sólo la fila de headers de columna,
  sin nada extra: una versión anterior metía ahí una franja compacta con serie/RUC/razón
  social para identificar hojas 2+ separadas del resto, pero al vivir en el `<thead>`
  esa franja se repetía también en la hoja 1, duplicando la info que ya muestra el header
  principal justo arriba. Se sacó — ninguno de los 3 diseños (Ledger Refinado / Grid
  Moderno / Denso Operativo) la contempla, y el header ya es suficiente en la práctica.
- Se numera "Página N de M" en cada hoja vía `@page { @bottom-center { content:
  "Página " counter(page) " de " counter(pages); } }` (`styles.css`) — un margin-box CSS
  nativo de Paged Media que `html2realpdf` captura del stylesheet y pinta en cada hoja
  física. El motor de paginación calcula `counter(pages)` él solo al renderizar, así que
  esto sí resuelve lo que antes parecía imposible sin medir de antemano. Limitación real:
  un margin-box sólo acepta texto con estilo básico (fuente, color, tamaño) — nada de
  imágenes ni SVG — por eso el QR de verificación SUNAT no puede repetirse ahí; sigue
  viviendo una sola vez, en el flujo normal de contenido al final del documento (última
  hoja), igual que el texto legal completo.

### 7.1. Márgenes reales por hoja: `@page`, no el padding de `.paper`

`.paper` tiene su propio `padding` (14mm/14mm/16mm) para verse como una hoja A4 en el
preview de pantalla — pero ese padding es una propiedad de UN elemento, y cuando ese
elemento se fragmenta en varias hojas físicas, el padding CSS sólo se aplica al
principio y al final del box completo (primera y última hoja), no a cada fragmento
intermedio. Antes de este fix, las hojas 2, 3... de un PDF largo arrancaban con el
contenido pegado al borde superior físico, sin margen.

La librería sí soporta márgenes reales por hoja, pero por dos caminos distintos que
`SKILL.md` pide no mezclar: la opción JS `page.margin` (sin soporte para contenido en el
margen) o el at-rule `@page` de CSS (que si permite margin-boxes con texto — necesario
para la numeración de arriba). Elegimos `@page` por eso. Como consecuencia:

- `renderPdf` recibe `mediaType: 'print'` — sin esto evalúa todo en `'screen'` (su
  default) y el bloque `@media print` (que apaga el `box-shadow` de `.paper`, entre
  otras cosas) nunca se aplicaba: el PDF salía con una sombra visible al pie de cada
  hoja.
- `renderPdf` recibe `layoutContext: 'page'` para que reflowee el ancho de `.paper`
  (210mm fijo, pensado para el preview) contra el content-box real que resulta de
  restarle los márgenes de `@page`.
- Dentro de `@media print`, `.paper` pierde su padding, ancho fijo y `box-shadow`
  (`padding:0; width:100%; box-shadow:none`) — si no, esos 14mm/16mm se sumarían
  encima de los márgenes de `@page`, duplicando el espacio y desalineando el contenido.

Todo esto vive exclusivamente en `pdf.js` (opciones de render) y el bloque
`@media print`/`@page` de `styles.css` — el preview en pantalla no lo ve nunca
(`@page` no tiene efecto fuera de paginación real), así que no hace falta duplicar
lógica ni mantener dos diseños de `.paper`.

### 7.2. Bloques atómicos chicos, no uno gigante

El cierre del comprobante (totales + letras + pago + QR/footer) empezó como UN solo
`.pdf-atomic` gigante (ver historial: se armó así para evitar que el QR quedara solo,
huérfano, en una hoja casi en blanco cuando `footer-wrap` no entraba después de todo lo
demás). Ese fix resolvía el huérfano, pero generaba el problema inverso: con boletas
cortas (pocos items) pero con MUCha info de pago (varios métodos + cuentas + 2-3 QRs de
billetera), el bloque completo podía no entrar en el espacio restante de la hoja 1 —y
al ser atómico, se empujaba ENTERO a la hoja 2, dejando la hoja 1 con mucho blanco
inútil aunque sobraba espacio de sobra para la mayor parte del contenido.

Fix: partir ese único atómico en 3 piezas independientes —
`.totals-wrap`/`.gm-totals-wrap` (totales + letras), el bloque de pago (sin envoltorio
atómico), y `.footer-wrap`/`.gm-footer-wrap`/`.do-footer-wrap` (QR + texto legal) — más
`break-inside: avoid` en cada ÍTEM individual del bloque de pago (`.pay-item`,
`.gm-chip`), no en el bloque completo. Así, si algo no entra, sólo esa pieza chica se
corre a la siguiente hoja — nunca el conjunto grande — y el corte entre ítems de pago
nunca parte un ícono a la mitad. `.do-bottom` (Denso Operativo) es la excepción: al ser
un layout de 2 columnas lado a lado (letras+pago | totales), fragmentarlo internamente
no está bien soportado por ningún motor CSS, así que se deja atómico como unidad
completa (igual se beneficia de tener `.do-footer-wrap` separado).

**Nota posterior**: la subida de imagen QR por billetera (hasta 3, con `.qr-cell`) se
sacó del todo — cada QR pesaba ~22mm y con 2-3 billeteras era lo que más aportaba a
este problema, además de "robar" espacio del comprobante sin ser obligatorio (a
diferencia del QR de verificación SUNAT, éste era sólo conveniencia). Se reemplazó por
2 campos de texto simples (nombre + número, `contact.wallet1*`/`wallet2*`) — el cliente
igual puede yapear/plinear al número, sin el costo de espacio de la imagen.

Con esto, una boleta corta con mucha info de pago ya no deja la hoja 1 vacía — usa casi
toda la hoja, y en el peor caso (4+ métodos de pago, cuentas bancarias y 2-3 QRs de
billetera en Grid Moderno) sólo el footer final (QR de SUNAT + texto legal, ~30mm) cae
en una segunda hoja corta. Eso ya no es un bug: es contenido real que no entra en una
sola A4 sin apretar el diseño.

### 7.3. CSS de layout que el renderer del PDF no soporta igual que un browser

Dos intentos de armar 2 columnas fallaron silenciosamente en el PDF real aunque se
veían perfectos en el preview (Chromium) — sin ningún diagnóstico en `pdf.diagnostics`:

- **`columns: 2`** (CSS multi-column) — el renderer lo ignora del todo y cae de vuelta
  a una sola columna apilada.
- **CSS Grid con `grid-auto-flow: column`** (repartir N ítems entre 2 columnas dejando
  que el navegador decida el placement) — con pocos ítems, los que caían en la 2ª
  columna IMPLÍCITA directamente no se pintaban: probado con el bloque de pago (1-6
  ítems variables) mostrando sólo 3 de 6 métodos de contacto en el PDF descargado, con
  los otros 3 completamente ausentes (no solo desalineados). Grid con posiciones
  EXPLÍCITAS (columnas ya fijas por HTML, sin auto-flow) si funciona bien — es lo que
  usa `.gm-card` (3 columnas fijas, mismo número de celdas siempre).

Lección: para layouts de N columnas donde el CONTEO de ítems varía, no confiar en que
el navegador reparta solo (`columns`, `grid-auto-flow`) — partir el array en JS
(`array.slice()`) y renderizar columnas EXPLÍCITAS con flexbox simple
(`display:flex` + hijos `flex:1`), que es el mecanismo ya probado en todo el resto del
proyecto (header, chips, cards). Ver `partyLeft`/`partyRight` en `renderLedger` (conteo
fijo, 3/3) y `.payment-info` (conteo variable — ahí se usó `flex-wrap` en vez de
columnas fijas, para que la fila se adapte sola a cuánta info cargó el usuario).

### 8. Sin TypeScript

El proyecto es chico (~500 LOC). Agregar TS requiere:
- tsconfig.json
- Tipos para fast-xml-parser, @imggion/html2realpdf (algunos no existen)
- Build más lento
- Onboarding más pesado

JSDoc en funciones públicas da los beneficios de tipos sin el costo. Si crece a >1000 LOC o多人, considerar TS.

### 9. Tres plantillas reales, una sola tabla de items

`template` tiene 3 valores (`ledger`, `grid`, `denso` — Ledger Refinado / Grid Moderno /
Denso Operativo) y cada uno arma un DOM distinto en `ui.js` (`renderLedger`, `renderGrid`,
`renderDenso`): header, bloque de datos del cliente y cierre (totales + letras + pago +
footer) son estructuras separadas por plantilla, con sus propias clases (`gm-*`, `do-*`)
estilizadas en `styles.css`.

La tabla de items es la única pieza 100% compartida entre las 3 — misma función
`itemsTable` en `ui.js`, misma clase `items-table`. Ahí vive el mecanismo de paginación
nativa (ver §7): si cada plantilla tuviera su propia tabla, habría que reimplementar
`<thead>` repetido + `break-inside` tres veces y mantenerlas en sync.
En vez de eso, las 3 plantillas sólo *restylean* la misma tabla vía selectores CSS scoped
(`.template-grid .items-table th`, `.template-denso .items-table th`, ...) con especificidad
más alta que las reglas base de `.paper` — nunca reconstruyen el markup de la tabla.

### 10. Vista previa: el PDF real, no una segunda copia en HTML

El preview visible (`#pdfPreview`) es el PDF real generado por `buildPdf()`, mostrado con
`pdf.preview()` de `@imggion/html2realpdf` (Shadow DOM cerrado + canvas, con su propio toolbar
de paginación/zoom — internamente es PDF.js, ver `dist/preview.d.ts` del paquete). Se
regenera con debounce (500ms) en cada cambio de `state` vía `scheduleRealPreview()` en
`main.js`. `#paper` sigue existiendo en el DOM pero fuera de pantalla (`.render-source` en
styles.css, `position:fixed; left:-99999px`) — es solo la fuente de layout que `buildPdf()`
necesita medir, nunca se muestra. Se descartó mantener el preview HTML en vivo como vista
aparte porque nunca pagina de verdad (un solo `<div>` en scroll continuo) y terminaba
divergiendo del PDF real (sin "Página N de M", sin el footer anclado al pie, etc. — ver §7).

**Bug de `initialScale: 'fit-width'` con scroll vertical activo**: el modo `'fit-width'`
nativo de `pdf.preview()` mide el ancho disponible del contenedor pero NO descuenta la
scrollbar vertical que él mismo termina mostrando — como una hoja A4 casi siempre es más alta
que el contenedor visible, hay scroll vertical casi siempre, y el resultado queda ~15-20px más
ancho de lo que realmente entra: aparece scroll horizontal también, cortando contenido a la
derecha. Confirmado empíricamente probando varios `initialScale` numéricos: con un valor que
apunte al mismo ancho pero reste ese colchón, el problema desaparece — o sea, el bug es
específico del modo string, no del scale resultante. Como no se puede inspeccionar el Shadow
DOM cerrado para depurarlo desde afuera, `main.js` implementa su propio "ajustar al ancho"
(`computeFitWidthScale`) en vez de usar `'fit-width'`:

```js
const A4_WIDTH_PT = 595.28; // ancho A4 en puntos PDF (210mm) — "100%" de pdf.preview() = 1px de canvas por punto (PDF.js)
const PREVIEW_PADDING = 28; // pasado explícito a preview() para que coincida con este cálculo
const PREVIEW_SCROLLBAR_BUFFER = 20; // colchón por la scrollbar vertical interna que 'fit-width' no descuenta
```

`595.28` salió de reverse-engineering (no está documentado): con `padding` default de 28px,
un host de 992px de ancho, `'fit-width'` computaba 157% — despejando, `157% × X = 992 - 2×28`
da `X ≈ 595`, que coincide con el ancho de A4 en puntos PDF (72dpi), la unidad nativa de
PDF.js. Se resolvió con dos mediciones independientes para confirmar. En resize de ventana,
`realPreview.setScale()` (método público de `PdfPreview`) reajusta sin rebuildear el PDF
entero — mucho más barato que `buildPdf()` + `preview()` de nuevo.

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
