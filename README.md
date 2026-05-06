# ⬡ IFCExplorer — Free Online IFC Viewer

<div align="center">

**A browser-based, WebXR-ready IFC building model viewer built on [A-Frame](https://aframe.io/) and [web-ifc-three](https://github.com/IFCjs/web-ifc-three).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![IFC](https://img.shields.io/badge/format-IFC2X3%20%7C%20IFC4%20%7C%20IFC4X3-brightgreen)](#supported-formats)
[![WebXR](https://img.shields.io/badge/WebXR-ready-orange)](#webxr--vr-mode)
[![A-Frame](https://img.shields.io/badge/A--Frame-1.4.1-red)](https://aframe.io/)

</div>

---

## Overview

**IFCExplorer** is a lightweight, zero-install web application that lets architects, engineers, and construction professionals open and explore IFC (Industry Foundation Classes) building models directly in the browser — no plugins required. Models can be inspected in classic 3D orbit mode, walked through in first-person, or experienced in immersive VR via WebXR.

---

## ✨ Features

### 📂 File Loading

- **Open local IFC files** — use the file picker to load any `.ifc` file from your device
- **Sample model** — instantly load a bundled architectural IFC to try the viewer
- **Schema validation** — supports IFC2X3, IFC4, and IFC4X3; warns on unsupported schemas

### 🔭 3D Orbit Viewer

- Smooth left-click orbit, right-click pan, scroll zoom
- Animated camera transitions to standard views (**Top, Front, Right, Home**)
- Interactive **View Cube** — click any face or corner to snap to that direction
- Background colour picker and scene reset

### 🚶 First-Person Walker

- WASD / arrow-key movement with navmesh constraint (stays on floors)
- Mouse-look drag controls
- On-screen directional pad (mobile-friendly)
- Avatar (body silhouette) shown while walking
- Live **floor elevation status** display — nearest storey detected automatically

### 🏢 Floor Navigation

- Automatic floor/storey detection from the IFC spatial structure
- Floor dropdown with elevation labels — teleport instantly to any storey

### 👁️ Visibility Controls

- Toggle **slab and ceiling** transparency to see inside floors
- Show / hide **MEP systems** per floor level
- Show / hide **structural beams** per reference level
- Click-to-inspect toggle

### 🔍 Element Inspection & Selection

- Click any building element to **highlight it in green** and open the Properties panel
- Element type badge, category, and height metadata
- Full IFC property sets rendered as tables
- **Space Info** panel — room name, level, and finish information

### 🌳 IFC Schema Tree (Left Panel)

- Full hierarchical spatial structure: Project → Site → Building → Storey → Elements
- **Elements grouped by IFC class** inside each storey (e.g. `IFCWALL`, `IFCDOOR`, `IFCBEAM`) with icons and count badges
- Click a spatial node or type-group row to expand/collapse
- Click an element leaf to select and highlight it in the 3D view
- Syncs with the 3D selection — selected elements scroll into view in the tree

### 📐 Resizable Panels

- **Schema panel** (left) — drag the right edge handle to resize; collapses fully via the View ribbon
- **Properties panel** (right) — drag the left edge handle to resize; opens automatically on element selection
- 3D viewport adjusts smoothly with no black-screen flicker on resize

### 🌐 WebXR / VR Mode

- Enter immersive VR on compatible headsets (Meta Quest, etc.)
- DOM overlay UI remains usable inside VR
- 6DOF hand controllers with ray-cast selection
- Thumbstick locomotion

### 🗺️ Additional Tools

- **Measure tool** for picking two model points and reading distance
- **Section box** clipping controls for isolating part of the model
- **Viewer report** summary with JSON and CSV export
- **Share link** action for copying or using the browser share sheet

### 🌍 Visitor Statistics

- Floating **Visitors** button (bottom-right) shows a live country flag counter popover
- Powered by [Flag Counter](http://s01.flagcounter.com) — click to see full analytics by country

---

## 🖼️ Screenshots

| 3D Orbit View                             | First-Person Walk                           |
| ----------------------------------------- | ------------------------------------------- |
| ![3D Orbit](assets/images/preview-m3.png) | ![Walker](assets/images/preview-seosan.png) |

---

## 🛠️ Technology Stack

| Technology                                              | Role                                    |
| ------------------------------------------------------- | --------------------------------------- |
| [A-Frame 1.4.1](https://aframe.io/)                     | 3D scene, WebXR runtime                 |
| [web-ifc](https://github.com/IFCjs/web-ifc)             | IFC geometry parser (WASM)              |
| [web-ifc-three](https://github.com/IFCjs/web-ifc-three) | Three.js IFC loader & subset management |
| [Three.js](https://threejs.org/)                        | 3D rendering                            |

---

## Supported Formats

| Schema | Status           |
| ------ | ---------------- |
| IFC2X3 | ✅ Full support  |
| IFC4   | ✅ Full support  |
| IFC4X3 | ✅ Full support  |
| Other  | ⚠️ Warning shown |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 16
- npm

### Install & Build

```bash
# Install dependencies (from workspace root containing node_modules)
npm install

# Build the bundle
npm run build

# Watch mode (rebuilds on change)
npm run watch
```

### Run locally

Serve the project with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` in a modern browser (Chrome, Edge, or Firefox recommended).

> **Note:** The WASM files (`web-ifc.wasm`, `web-ifc-mt.wasm`) must be present in `assets/js/`. The `npm run build` step copies them automatically via the `copy-runtime` script.

---

## 🗂️ Project Structure

```
IFC_Web_Viewer/
├── index.html              # Main application (single-page)
├── package.json
└── assets/
    ├── css/
    │   └── app.css         # Dark-theme UI styles (Revit-inspired)
    ├── images/             # Button icons and preview images
    └── js/
        ├── bundle.js       # Compiled Three.js + IFC loader bundle
        ├── buttons.js      # Ribbon button logic
        ├── cursor_click.js # Element selection, ray-cast click & green highlight
        ├── select.js       # Subset selection helpers
        ├── overlay.js      # UI overlay management
        ├── wasd.js         # Custom WASD movement controls
        ├── simple-navmesh-constraint.js
        ├── web-ifc.wasm
        ├── web-ifc-mt.wasm
        └── ...
```

---

## ⌨️ Controls

### 3D Orbit Mode

| Action          | Control                                   |
| --------------- | ----------------------------------------- |
| Orbit           | Left-click + drag                         |
| Pan             | Right-click + drag or Middle-click + drag |
| Zoom            | Scroll wheel                              |
| Inspect element | Click (highlights in green)               |

### Walk Mode

| Action            | Control                        |
| ----------------- | ------------------------------ |
| Move              | W / A / S / D or Arrow keys    |
| Look              | Click + drag                   |
| Up / Down         | E / Q                          |
| Teleport to floor | Navigate → Floor dropdown → Go |

---

## 🔍 SEO & Discoverability

IFCExplorer is optimised for search engine discovery with:

- Descriptive `<title>` and `<meta description>` targeting AEC professionals
- 60+ keyword tags covering BIM, IFC, WebXR, architecture, engineering, and construction terms
- Open Graph and Twitter Card meta for rich social previews
- JSON-LD `WebApplication` structured data for Google rich results
- `<link rel="canonical">` and `robots: index, follow`

---

## 📄 License

MIT © IFC.js contributors
