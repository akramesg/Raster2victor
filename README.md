# Raster2Vector Studio 🎨⚡

> An interactive, browser-based raster-to-vector conversion suite and Delaunay mesh engine. Transform PNG, JPG, WebP, and GIFs into clean, scalable SVG paths with real-time preview, intelligent auto-match fidelity tuning, and customizable palette controls.

![Raster2Vector Studio Preview](https://raw.githubusercontent.com/akramesg/Raster2victor/main/preview.png) *(or open index.html directly in browser)*

---

## ✨ Features

- **3 Dedicated Vectorization Engines**:
  - **Multi-Color Layered SVG**: K-Means++ perceptual color quantization, sub-pixel Marching Squares contour tracing, connected-component despeckling, and seamless hierarchical layering.
  - **B&W / Ink & Stencil**: Luminance thresholding, adaptive local sketching, and Sobel gradient edge line-art tracing.
  - **Low-Poly Mesh**: Bowyer-Watson Delaunay triangulation with edge-aware importance point sampling.
- **✨ Best Match to Original (Auto-Fidelity Optimizer)**:
  - 1-click intelligent optimizer that inspects the image's color richness, edge transitions, and high-frequency noise.
  - Automatically tunes color count, analysis resolution, RDP simplification tolerance, smoothing, and pre-blur to maximize perceptual similarity against the original image.
  - Displays a live **Match Fidelity %** score.
- **Interactive Palette & Layer Inspector**:
  - Live swatch recoloring without re-tracing.
  - Eye visibility toggles to hide/isolate layers (e.g. 1-click background removal).
  - Multi-layer selection to merge adjacent color clusters.
- **Comparison & Inspection Modes**:
  - **Split View**: Draggable interactive curtain divider comparing original raster vs. vector SVG.
  - **Onion Skin**: Opacity blend slider.
  - **Dual View**: Synchronized side-by-side comparison.
  - **Wireframe & Anchor Nodes**: Inspect Bézier control vertices and polygon wireframes.
- **Export Options**:
  - **Download Scalable Vector Graphics (.SVG)**
  - **Inspect & Copy Raw SVG Code**
  - **Export High-Resolution PNG (2x scale)**
- **Zero Build Dependencies**:
  - Pure modular ES6 JavaScript, HTML5 Canvas, and modern CSS. Runs directly in any modern browser without npm build steps.

---

## 🚀 Quick Start

### Option 1: Direct in Browser
Simply open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local Static Server
Run with any lightweight server of your choice:

```bash
# Using Node
npx serve .

# Or using Python 3
python -m http.server 3000
```
Then open [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Tech Stack & Algorithms

- **Quantization**: Redmean-weighted perceptual K-Means++ in RGB space.
- **Denoising**: Connected-components despeckling (removes stray islands `< minArea` pixels).
- **Contour Tracing**: Sub-pixel Marching Squares algorithm with outer boundary and inner hole classification (`evenodd` fill rule).
- **Path Simplification**: Ramer-Douglas-Peucker (RDP) polyline simplification with corner sharpness thresholding.
- **Curve Fitting**: Corner-clamped Catmull-Rom to Cubic Bézier (`C`) spline approximation.
- **Triangulation**: Bowyer-Watson incremental Delaunay triangulation with Sobel magnitude rejection sampling.

---

## 📄 License

MIT License. Free for personal and commercial use.
