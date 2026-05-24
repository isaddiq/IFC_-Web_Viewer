# IFC Static Web Viewer

A fully client-side BIM viewer that runs directly in the browser — no server, no install, no data upload. Drop an `.ifc` file onto the page and instantly explore its geometry, spatial hierarchy, property sets, materials, classifications, measurements, and schema relationships.

[![Live demo](https://img.shields.io/badge/Live%20demo-isaddiq.github.io-blue?style=flat-square)](https://isaddiq.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## ✨ Features

### 3D Viewport
- **Orbit / pan / zoom** with mouse or touch
- **View modes** — Shaded, X-Ray, Wireframe
- **Exploded view** slider (spreads elements apart for internal inspection)
- **Section box** — six-plane live clipping with on-screen sliders
- **Distance measurement** — click two points to measure real-world distance
- **Annotation pins** — place issue markers on elements with title, description, status and priority
- **Screenshot** — exports the current canvas as a PNG
- **View Cube** — click faces/edges for Front, Back, Top, Bottom, Left, Right presets
- **Edge overlay** toggle and axis-origin indicator
- **Storey navigation** — isolate a floor level from the toolbar
- **Slab transparency**, **MEP isolation**, and **Structural beam** isolation quick-actions

### Selection & Visibility
- Click to select; **Ctrl/Shift-click** to multi-select
- **Hide**, **Isolate**, **Show all** via toolbar, keyboard shortcut, or right-click context menu
- **Zoom to selection** (F key or toolbar button)
- Per-element **colour overrides** and **opacity overrides**
- **Selection sets** — save and restore named groups of elements

### Left Sidebar
| Tab | Content |
|---|---|
| **Spatial** | Full IFC spatial tree (Project → Site → Building → Storey → Elements) with expand/collapse |
| **Entities** | Elements grouped by IFC class with per-class select-all / hide / isolate |
| **Layers** | Elements grouped by storey for layer-style control |
| **Views** | Saved camera views with hidden/isolated state snapshots |
| **Sets** | Named selection sets |

### Inspector (Right Panel)
Clicking any element shows its full details:
- IFC class, GlobalId, Name, Description, ObjectType, Tag, Predefined type
- **Property sets** — all `IfcPropertySet` entries with typed values
- **Quantity sets** — area, volume, length, count values with units
- **Materials** — `IfcMaterial`, layer sets, constituent sets
- **Classifications** — OmniClass, Uniclass, custom systems
- **Raw STEP attributes** — direct STEP line decode
- **Relationships** — spatial containment, aggregations, type definitions
- **Colour & opacity** per-element controls with colour picker
- **Export** element data as JSON

### Search
Full-text search supports:
- IFC class name (`IfcWall`, `wall`, …)
- Element name and GlobalId
- Express ID (`#1234`)
- Property key:value pairs (`FireRating:REI 90`)
- Material name, storey name, classification code

### Schema Explorer
Browse every IFC entity class defined in the loaded model's schema — click a class to select all its instances in the viewport.

### Model Summary
Top-10 class breakdown, entity counts, geometry items, storey count, missing-name audit, and relationship counts.

### Performance
- **Fast first render** — geometry streamed immediately; property/material/classification indexes built in the background so the model is interactive within seconds
- **Deferred secondary data** — pset / material / classification link indexes run asynchronously after first render; a status pill ("Indexing properties…") is shown until complete
- **WASM pre-warming** — web-ifc WASM is initialised during browser idle time before the user picks a file
- **Asset preloading** — `<link rel="preload">` hints ensure the WASM binary and IFC bundle are in-flight before JavaScript requests them
- **Chunked geometry baking** — large models bake in 64-item chunks with UI yields to keep the page responsive

### UX
- Light and **dark theme** (persisted)
- Resizable left / right / bottom panels (drag the dividers; double-click bottom to reset)
- Full **keyboard shortcut** set (see below)
- Drag-and-drop file loading from the start screen
- Toast notifications for actions and errors

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `O` | Open file picker |
| `F` | Zoom to selection |
| `A` | Show all elements |
| `H` | Hide selected |
| `I` | Isolate selected |
| `Esc` | Clear selection |
| `Ctrl + F` | Focus search bar |
| `M` | Toggle measure mode |
| `S` | Toggle section box |
| `E` | Toggle edge overlay |
| `X` | Toggle X-Ray mode |
| `W` | Toggle wireframe mode |
| `1` – `6` | Camera presets (iso / top / front / back / left / right) |
| `?` | Show keyboard shortcut help |
| Right-click | Context menu |

---

## 🏗️ Tech Stack

| Layer | Library / version |
|---|---|
| UI framework | [React 18.3.1](https://react.dev/) (UMD CDN, no bundler) |
| 3D rendering | [Three.js 0.160.0](https://threejs.org/) (ES module CDN) |
| IFC parser | [web-ifc 0.0.35](https://github.com/ifcjs/web-ifc) (WASM) via `ifc-loader-bundle.js` |
| JSX compiler | [esbuild](https://esbuild.github.io/) (dev-only build step) |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| Icons | Flaticon free PNGs (see [Attribution](#attribution)) |

The compiled scripts in `assets/js/compiled/` are pre-built IIFE bundles. No Node.js runtime is needed to **serve** the project — only to **rebuild** after editing JSX sources.

---

## 📁 Project Layout

```
IFC Webviewer/
├── index.html                   # App entry — loads React, Three.js, then compiled scripts
├── package.json                 # esbuild build script only (no runtime deps)
├── assets/
│   ├── css/
│   │   └── main.css             # Design tokens, layout, all component styles
│   ├── ifc/
│   │   └── Building-Structural.ifc  # Sample model
│   ├── icons/
│   │   └── flaticon/            # PNG icon set + ATTRIBUTION.md
│   ├── logos/
│   │   └── ifc-logo.png
│   └── js/
│       ├── app.jsx              # App shell, state, routing, toolbar, viewer canvas
│       ├── core/
│       │   ├── ifcloader.jsx    # web-ifc integration — critical-path load + deferred psets
│       │   └── model.jsx        # Synthetic demo model helpers
│       ├── viewer/
│       │   └── viewer.jsx       # ThreeViewer class — scene, picking, section, measure
│       ├── ui/
│       │   ├── icons.jsx        # Icon component wrappers
│       │   └── panels.jsx       # Sidebar tabs, Inspector, BottomPanel, Schema Explorer
│       ├── compiled/            # Pre-built IIFE scripts (checked in, rebuilt by npm run build)
│       │   ├── core/
│       │   ├── viewer/
│       │   └── ui/
│       ├── ifc-loader-bundle.js # Bundled web-ifc-three (IFCLoader + web-ifc WASM glue)
│       └── web-ifc-0.0.35/
│           ├── web-ifc.wasm
│           └── web-ifc-mt.wasm  # Multi-threaded variant
```

---

## 🚀 Run Locally

A local HTTP server is required — `file://` URLs block WASM and the sample IFC fetch.

```bash
# Option A — npx (no install)
npx serve .

# Option B — Python
python -m http.server 8080

# Option C — VS Code Live Server
# Right-click index.html → "Open with Live Server"
```

Then open the URL shown (e.g. `http://localhost:3000`).

---

## 🔧 Rebuild Browser Scripts

After editing any `.jsx` source file, recompile to the `compiled/` folder:

```bash
npm run build
```

This runs `esbuild` on each source file as a standalone IIFE bundle (no tree-shaking across files — each script is self-contained and relies on globals set by the previous one).

> **Note:** `npm install` is not required. The build script uses `npx --yes esbuild` which downloads esbuild on first run.

---

## 🗂️ IFC Support

| Schema | Status |
|---|---|
| IFC2x3 | ✅ Supported |
| IFC4 / IFC4.1 | ✅ Supported |
| IFC4.3 | ✅ Supported |
| IFC5 | ❌ Not yet |

Accepted file extensions: `.ifc`, `.ifcXML`, `.ifcZIP`

---

## 📜 Attribution

UI icons are free PNGs sourced from [Flaticon](https://www.flaticon.com/). See [`assets/icons/flaticon/ATTRIBUTION.md`](assets/icons/flaticon/ATTRIBUTION.md) for the full table of sources.

---

## 👤 Author

**Saddiq** — [isaddiq.github.io](https://isaddiq.github.io/)

Source: [github.com/isaddiq/IFC_Web_Viewer](https://github.com/isaddiq/IFC_Web_Viewer)
