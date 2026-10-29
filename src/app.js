import { VectorizerEngine } from './algorithms.js';
import { SAMPLE_PRESETS } from './samples.js';

class Raster2VectorApp {
  constructor() {
    // Source image state
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
    this.currentSampleId = 'toucan';
    this.sourceName = 'tropical-toucan';

    // Working state
    this.mode = 'color'; // 'color' | 'bw' | 'lowpoly'
    this.viewMode = 'split'; // 'split' | 'vector' | 'onion' | 'side'
    this.splitPosition = 0.5; // 0.0 to 1.0
    this.wireframe = false;
    this.showNodes = false;

    // Custom/edited palette state (when merging colors)
    this.customPalette = null;
    this.selectedLayerIds = new Set();

    // Latest vectorization result
    this.vectorResult = null;
    this.currentSvgString = '';

    // Viewport pan & zoom
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.isDraggingSplit = false;
    this.panStart = { x: 0, y: 0 };

    // Debounce timer
    this.traceTimer = null;

    this.initDOM();
    this.bindEvents();
    this.loadSample('toucan');
  }

  initDOM() {
    // Header & View controls
    this.samplePillsEl = document.getElementById('sample-pills');
    this.fileInput = document.getElementById('file-input');
    this.viewModeGroup = document.getElementById('view-mode-group');
    this.btnWireframe = document.getElementById('btn-wireframe');
    this.btnNodes = document.getElementById('btn-nodes');
    this.btnInspectSvg = document.getElementById('btn-inspect-svg');
    this.btnExportPng = document.getElementById('btn-export-png');
    this.btnDownloadSvg = document.getElementById('btn-download-svg');

    // Mode tabs & presets
    this.modeTabs = document.getElementById('mode-tabs');
    this.stylePresets = document.getElementById('style-presets');
    this.btnAutoMatch = document.getElementById('btn-auto-match');
    this.fidelityBadge = document.getElementById('fidelity-badge');
    this.autoMatchSub = document.getElementById('auto-match-sub');
    this.panelColor = document.getElementById('panel-color');
    this.panelBw = document.getElementById('panel-bw');
    this.panelLowpoly = document.getElementById('panel-lowpoly');
    this.panelGeometry = document.getElementById('panel-geometry');

    // Inputs: Color
    this.ctrlNumColors = document.getElementById('ctrl-num-colors');
    this.valNumColors = document.getElementById('val-num-colors');
    this.ctrlStacking = document.getElementById('ctrl-stacking');
    this.ctrlGapFix = document.getElementById('ctrl-gap-fix');
    this.valGapFix = document.getElementById('val-gap-fix');

    // Inputs: B&W
    this.ctrlBwMode = document.getElementById('ctrl-bw-mode');
    this.ctrlThreshold = document.getElementById('ctrl-threshold');
    this.valThreshold = document.getElementById('val-threshold');
    this.ctrlBwInvert = document.getElementById('ctrl-bw-invert');
    this.ctrlBwTrans = document.getElementById('ctrl-bw-trans');
    this.ctrlFgColor = document.getElementById('ctrl-fg-color');
    this.ctrlBgColor = document.getElementById('ctrl-bg-color');

    // Inputs: Low-Poly
    this.ctrlPolyPoints = document.getElementById('ctrl-poly-points');
    this.valPolyPoints = document.getElementById('val-poly-points');
    this.ctrlPolyEdge = document.getElementById('ctrl-poly-edge');
    this.valPolyEdge = document.getElementById('val-poly-edge');

    // Inputs: Geometry & Smoothing
    this.ctrlSmoothing = document.getElementById('ctrl-smoothing');
    this.valSmoothing = document.getElementById('val-smoothing');
    this.ctrlSimplify = document.getElementById('ctrl-simplify');
    this.valSimplify = document.getElementById('val-simplify');
    this.ctrlCorners = document.getElementById('ctrl-corners');
    this.valCorners = document.getElementById('val-corners');
    this.ctrlDespeckle = document.getElementById('ctrl-despeckle');
    this.valDespeckle = document.getElementById('val-despeckle');

    // Inputs: Pre-processing
    this.ctrlResolution = document.getElementById('ctrl-resolution');
    this.valResolution = document.getElementById('val-resolution');
    this.ctrlBlur = document.getElementById('ctrl-blur');
    this.valBlur = document.getElementById('val-blur');
    this.ctrlContrast = document.getElementById('ctrl-contrast');
    this.valContrast = document.getElementById('val-contrast');
    this.ctrlSaturation = document.getElementById('ctrl-saturation');
    this.valSaturation = document.getElementById('val-saturation');
    this.ctrlBrightness = document.getElementById('ctrl-brightness');
    this.valBrightness = document.getElementById('val-brightness');
    this.btnResetPreproc = document.getElementById('btn-reset-preproc');

    // Stage & Viewport
    this.viewport = document.getElementById('viewport');
    this.canvasStage = document.getElementById('canvas-stage');
    this.layerRaster = document.getElementById('layer-raster');
    this.layerVector = document.getElementById('layer-vector');
    this.rasterCanvas = document.getElementById('raster-canvas');
    this.svgMount = document.getElementById('svg-mount');
    this.splitDivider = document.getElementById('split-divider');
    this.onionBar = document.getElementById('onion-bar');
    this.ctrlOnionOpacity = document.getElementById('ctrl-onion-opacity');
    this.valOnionOpacity = document.getElementById('val-onion-opacity');
    this.dropOverlay = document.getElementById('drop-overlay');
    this.tagRaster = document.getElementById('tag-raster');
    this.tagVector = document.getElementById('tag-vector');

    // Zoom & Backdrop HUD
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomFit = document.getElementById('btn-zoom-fit');
    this.zoomReadout = document.getElementById('zoom-readout');
    this.backdropGroup = document.getElementById('backdrop-group');

    // Metrics
    this.statFidelity = document.getElementById('stat-fidelity');
    this.statDims = document.getElementById('stat-dims');
    this.statColors = document.getElementById('stat-colors');
    this.statPaths = document.getElementById('stat-paths');
    this.statNodes = document.getElementById('stat-nodes');
    this.statSize = document.getElementById('stat-size');
    this.statTime = document.getElementById('stat-time');

    // Palette Panel
    this.paletteCountBadge = document.getElementById('palette-count-badge');
    this.paletteList = document.getElementById('palette-list');
    this.btnHideBg = document.getElementById('btn-hide-bg');
    this.btnMergeSelected = document.getElementById('btn-merge-selected');
    this.btnResetPalette = document.getElementById('btn-reset-palette');

    // Modal & Toast
    this.codeModal = document.getElementById('code-modal');
    this.svgCodeTextarea = document.getElementById('svg-code-textarea');
    this.modalSvgStats = document.getElementById('modal-svg-stats');
    this.btnCopyModalSvg = document.getElementById('btn-copy-modal-svg');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.toast = document.getElementById('toast');

    // Render Sample Pills
    this.samplePillsEl.innerHTML = SAMPLE_PRESETS.map(
      (s) =>
        `<button type="button" class="sample-pill ${s.id === this.currentSampleId ? 'active' : ''}" data-sample="${s.id}" title="${s.subtitle}">${s.name}</button>`
    ).join('');
  }

  bindEvents() {
    // Sample Switcher
    this.samplePillsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.sample-pill');
      if (!btn) return;
      this.loadSample(btn.dataset.sample);
    });

    // File Upload
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadFile(e.target.files[0]);
      }
    });

    // Clipboard Paste (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) this.loadFile(file);
          break;
        }
      }
    });

    // Drag & Drop Image
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropOverlay.classList.remove('hidden');
    });
    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null || !document.body.contains(e.relatedTarget)) {
        this.dropOverlay.classList.add('hidden');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropOverlay.classList.add('hidden');
      if (e.dataTransfer?.files?.[0]) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });

    // Mode Tabs
    this.modeTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.mode-tab');
      if (!tab) return;
      this.setMode(tab.dataset.mode);
    });

    // Quick Style Presets
    this.stylePresets.addEventListener('click', (e) => {
      const chip = e.target.closest('.preset-chip');
      if (!chip) return;
      this.btnAutoMatch.classList.remove('active');
      this.applyStylePreset(chip.dataset.preset);
      this.stylePresets.querySelectorAll('.preset-chip').forEach((c) => c.classList.toggle('active', c === chip));
    });

    // Auto-Match Best Fidelity Button
    this.btnAutoMatch.addEventListener('click', () => {
      this.autoMatchToOriginal();
    });

    // Bind all parameter sliders & selects
    const bindRange = (input, labelEl, formatter, resetCustomPalette = false) => {
      input.addEventListener('input', () => {
        if (labelEl) labelEl.textContent = formatter(input.value);
        if (resetCustomPalette) {
          this.customPalette = null;
          this.selectedLayerIds.clear();
        }
        this.scheduleTrace();
      });
    };

    bindRange(this.ctrlNumColors, this.valNumColors, (v) => v, true);
    bindRange(this.ctrlGapFix, this.valGapFix, (v) => `${v} px`);
    bindRange(this.ctrlThreshold, this.valThreshold, (v) => v);
    bindRange(this.ctrlPolyPoints, this.valPolyPoints, (v) => v);
    bindRange(this.ctrlPolyEdge, this.valPolyEdge, (v) => `${v}%`);
    bindRange(this.ctrlSmoothing, this.valSmoothing, (v) => Number(v).toFixed(2));
    bindRange(this.ctrlSimplify, this.valSimplify, (v) => `${Number(v).toFixed(1)} px`);
    bindRange(this.ctrlCorners, this.valCorners, (v) => `${v}°`);
    bindRange(this.ctrlDespeckle, this.valDespeckle, (v) => `${v} px²`);
    bindRange(this.ctrlResolution, this.valResolution, (v) => `${v} px`);
    bindRange(this.ctrlBlur, this.valBlur, (v) => `${v} px`, true);
    bindRange(this.ctrlContrast, this.valContrast, (v) => v, true);
    bindRange(this.ctrlSaturation, this.valSaturation, (v) => v, true);
    bindRange(this.ctrlBrightness, this.valBrightness, (v) => v, true);

    [
      this.ctrlStacking,
      this.ctrlBwMode,
      this.ctrlBwInvert,
      this.ctrlBwTrans,
      this.ctrlFgColor,
      this.ctrlBgColor
    ].forEach((el) => {
      el.addEventListener('input', () => this.scheduleTrace());
    });

    this.btnResetPreproc.addEventListener('click', () => {
      this.ctrlResolution.value = 520;
      this.valResolution.textContent = '520 px';
      this.ctrlBlur.value = 1;
      this.valBlur.textContent = '1 px';
      this.ctrlContrast.value = 0;
      this.valContrast.textContent = '0';
      this.ctrlSaturation.value = 0;
      this.valSaturation.textContent = '0';
      this.ctrlBrightness.value = 0;
      this.valBrightness.textContent = '0';
      this.customPalette = null;
      this.scheduleTrace();
    });

    // View Modes (Split, Vector, Onion, Side-by-Side)
    this.viewModeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      this.viewMode = btn.dataset.view;
      this.viewModeGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
      this.updateViewModeLayout();
    });

    this.ctrlOnionOpacity.addEventListener('input', () => {
      const v = Number(this.ctrlOnionOpacity.value);
      this.valOnionOpacity.textContent = `${v}%`;
      this.updateViewModeLayout();
    });

    // Wireframe & Nodes Overlays
    this.btnWireframe.addEventListener('click', () => {
      this.wireframe = !this.wireframe;
      this.btnWireframe.classList.toggle('active', this.wireframe);
      this.refreshSvgMarkupOnly();
    });

    this.btnNodes.addEventListener('click', () => {
      this.showNodes = !this.showNodes;
      this.btnNodes.classList.toggle('active', this.showNodes);
      this.refreshSvgMarkupOnly();
    });

    // Split Curtain Dragging
    this.splitDivider.addEventListener(' pointerdown', (e) => {
      e.stopPropagation();
      this.isDraggingSplit = true;
    });
    this.splitDivider.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isDraggingSplit = true;
    });

    // Viewport Zoom & Pan
    this.viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.split-divider')) {
        this.isDraggingSplit = true;
        return;
      }
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingSplit) {
        const rect = this.canvasStage.getBoundingClientRect();
        if (rect.width > 0) {
          this.splitPosition = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
          this.updateViewModeLayout();
        }
        return;
      }
      if (this.isPanning) {
        this.panX = e.clientX - this.panStart.x;
        this.panY = e.clientY - this.panStart.y;
        this.applyViewportTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingSplit = false;
      this.isPanning = false;
    });

    this.viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        this.zoom = Math.max(0.2, Math.min(8, this.zoom * factor));
        this.applyViewportTransform();
      },
      { passive: false }
    );

    this.btnZoomIn.addEventListener('click', () => {
      this.zoom = Math.min(8, this.zoom * 1.25);
      this.applyViewportTransform();
    });
    this.btnZoomOut.addEventListener('click', () => {
      this.zoom = Math.max(0.2, this.zoom / 1.25);
      this.applyViewportTransform();
    });
    this.btnZoomFit.addEventListener('click', () => this.fitStageToViewport());

    // Backdrop Selector
    this.backdropGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.hud-btn');
      if (!btn) return;
      const bg = btn.dataset.bg;
      this.viewport.classList.remove('bg-checker', 'bg-dark', 'bg-light');
      this.viewport.classList.add(`bg-${bg}`);
      this.backdropGroup.querySelectorAll('.hud-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });

    // Palette Actions
    this.btnHideBg.addEventListener('click', () => {
      if (!this.vectorResult || !this.vectorResult.layers.length) return;
      const bgLayer = this.vectorResult.layers[0];
      bgLayer.visible = !bgLayer.visible;
      this.renderPaletteInspector();
      this.refreshSvgMarkupOnly();
    });

    this.btnMergeSelected.addEventListener('click', () => this.mergeSelectedLayers());

    this.btnResetPalette.addEventListener('click', () => {
      this.customPalette = null;
      this.selectedLayerIds.clear();
      this.scheduleTrace();
    });

    // Export Actions
    this.btnDownloadSvg.addEventListener('click', () => this.downloadSvg());
    this.btnExportPng.addEventListener('click', () => this.exportPng(2));
    this.btnInspectSvg.addEventListener('click', () => {
      this.svgCodeTextarea.value = this.currentSvgString;
      const kb = (new Blob([this.currentSvgString]).size / 1024).toFixed(1);
      this.modalSvgStats.textContent = `${this.vectorResult?.width || 0}×${this.vectorResult?.height || 0}px • ${kb} KB • ${this.vectorResult?.stats?.paths || 0} paths`;
      this.codeModal.classList.remove('hidden');
    });

    this.btnCloseModal.addEventListener('click', () => this.codeModal.classList.add('hidden'));
    this.codeModal.addEventListener('click', (e) => {
      if (e.target === this.codeModal) this.codeModal.classList.add('hidden');
    });

    this.btnCopyModalSvg.addEventListener('click', () => {
      navigator.clipboard.writeText(this.currentSvgString);
      this.showToast('SVG code copied to clipboard!');
    });

    window.addEventListener('resize', () => this.fitStageToViewport());
  }

  loadSample(sampleId) {
    const preset = SAMPLE_PRESETS.find((s) => s.id === sampleId) || SAMPLE_PRESETS[0];
    this.currentSampleId = preset.id;
    this.sourceName = preset.id;
    this.customPalette = null;
    this.selectedLayerIds.clear();

    this.samplePillsEl.querySelectorAll('.sample-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sample === preset.id);
    });

    const size = 640;
    this.sourceCanvas.width = size;
    this.sourceCanvas.height = size;
    preset.render(this.sourceCtx, size, size);

    this.runVectorization(true);
  }

  loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceCanvas.width = img.naturalWidth || img.width;
        this.sourceCanvas.height = img.naturalHeight || img.height;
        this.sourceCtx.clearRect(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
        this.sourceCtx.drawImage(img, 0, 0);

        this.sourceName = file.name.replace(/\.[^.]+$/, '') || 'vectorized-image';
        this.currentSampleId = null;
        this.customPalette = null;
        this.selectedLayerIds.clear();
        this.samplePillsEl.querySelectorAll('.sample-pill').forEach((b) => b.classList.remove('active'));

        this.runVectorization(true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setMode(mode) {
    this.mode = mode;
    this.modeTabs.querySelectorAll('.mode-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });

    this.panelColor.classList.toggle('hidden', mode !== 'color');
    this.panelBw.classList.toggle('hidden', mode !== 'bw');
    this.panelLowpoly.classList.toggle('hidden', mode !== 'lowpoly');
    this.panelGeometry.classList.toggle('hidden', mode === 'lowpoly');

    this.scheduleTrace();
  }

  applyStylePreset(preset) {
    this.customPalette = null;
    this.selectedLayerIds.clear();

    const setSlider = (input, label, val, unit = '') => {
      input.value = val;
      if (label) label.textContent = `${val}${unit}`;
    };

    switch (preset) {
      case 'illustration':
        this.setMode('color');
        setSlider(this.ctrlNumColors, this.valNumColors, 10);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.65');
        setSlider(this.ctrlSimplify, this.valSimplify, '1.0', ' px');
        setSlider(this.ctrlDespeckle, this.valDespeckle, 16, ' px²');
        this.ctrlStacking.value = 'stacked';
        break;
      case 'poster':
        this.setMode('color');
        setSlider(this.ctrlNumColors, this.valNumColors, 6);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.80');
        setSlider(this.ctrlSimplify, this.valSimplify, '1.5', ' px');
        setSlider(this.ctrlDespeckle, this.valDespeckle, 36, ' px²');
        this.ctrlStacking.value = 'stacked';
        break;
      case 'hd_photo':
        this.setMode('color');
        setSlider(this.ctrlNumColors, this.valNumColors, 20);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.50');
        setSlider(this.ctrlSimplify, this.valSimplify, '0.7', ' px');
        setSlider(this.ctrlDespeckle, this.valDespeckle, 8, ' px²');
        this.ctrlStacking.value = 'stacked';
        break;
      case 'logo':
        this.setMode('color');
        setSlider(this.ctrlNumColors, this.valNumColors, 4);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.85');
        setSlider(this.ctrlSimplify, this.valSimplify, '1.8', ' px');
        setSlider(this.ctrlDespeckle, this.valDespeckle, 50, ' px²');
        this.ctrlStacking.value = 'cutout';
        break;
      case 'stencil':
        this.setMode('bw');
        this.ctrlBwMode.value = 'threshold';
        setSlider(this.ctrlThreshold, this.valThreshold, 135);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.70');
        setSlider(this.ctrlSimplify, this.valSimplify, '1.1', ' px');
        break;
      case 'lineart':
        this.setMode('bw');
        this.ctrlBwMode.value = 'edges';
        setSlider(this.ctrlThreshold, this.valThreshold, 175);
        setSlider(this.ctrlSmoothing, this.valSmoothing, '0.55');
        setSlider(this.ctrlSimplify, this.valSimplify, '0.8', ' px');
        setSlider(this.ctrlDespeckle, this.valDespeckle, 8, ' px²');
        break;
      case 'crystal':
        this.setMode('lowpoly');
        setSlider(this.ctrlPolyPoints, this.valPolyPoints, 1050);
        setSlider(this.ctrlPolyEdge, this.valPolyEdge, 75, '%');
        break;
    }

    this.scheduleTrace();
  }

  /**
   * Analyze the current image and automatically pick the best parameters
   * to match closest to the original raster image.
   */
  autoMatchToOriginal() {
    this.customPalette = null;
    this.selectedLayerIds.clear();

    // Downsample to a fast 200x200 analysis buffer to evaluate color clusters & noise
    const sampleCanvas = document.createElement('canvas');
    const sw = Math.min(200, this.sourceCanvas.width);
    const sh = Math.min(200, this.sourceCanvas.height);
    sampleCanvas.width = sw;
    sampleCanvas.height = sh;
    const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(this.sourceCanvas, 0, 0, sw, sh);
    const sampleData = sCtx.getImageData(0, 0, sw, sh);

    const best = VectorizerEngine.findBestMatchOptions(sampleData);

    const setSlider = (input, label, val, unit = '') => {
      input.value = val;
      if (label) label.textContent = `${val}${unit}`;
    };

    this.setMode(best.mode);
    setSlider(this.ctrlNumColors, this.valNumColors, best.numColors);
    this.ctrlStacking.value = best.layerStacking;
    setSlider(this.ctrlGapFix, this.valGapFix, best.strokeGapFix.toFixed(1), ' px');
    setSlider(this.ctrlSmoothing, this.valSmoothing, best.smoothing.toFixed(2));
    setSlider(this.ctrlSimplify, this.valSimplify, best.simplifyTolerance.toFixed(1), ' px');
    setSlider(this.ctrlCorners, this.valCorners, best.cornerThreshold, '°');
    setSlider(this.ctrlDespeckle, this.valDespeckle, best.minArea, ' px²');
    setSlider(this.ctrlResolution, this.valResolution, best.resolution, ' px');
    setSlider(this.ctrlBlur, this.valBlur, best.blurRadius, ' px');
    setSlider(this.ctrlContrast, this.valContrast, best.contrast);
    setSlider(this.ctrlSaturation, this.valSaturation, best.saturation);
    setSlider(this.ctrlBrightness, this.valBrightness, best.brightness);

    // Highlight Auto-Match button and clear preset chip highlights
    this.btnAutoMatch.classList.add('active');
    this.stylePresets.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
    this.autoMatchSub.textContent = best.profileSummary;

    this.runVectorization(false);
    const actualFidelity = this.vectorResult?.stats?.fidelity ?? best.estimatedScore;
    this.showToast(`✨ Best Match Applied — ${actualFidelity}% Fidelity (${best.numColors} Colors)`);
  }

  scheduleTrace() {
    if (this.traceTimer) clearTimeout(this.traceTimer);
    this.traceTimer = setTimeout(() => {
      this.runVectorization(false);
    }, 35);
  }

  runVectorization(fitAfter = false) {
    const t0 = performance.now();

    // 1. Scale source image to target working resolution
    const maxDim = Number(this.ctrlResolution.value) || 520;
    const srcW = this.sourceCanvas.width;
    const srcH = this.sourceCanvas.height;
    const scale = Math.min(1.5, maxDim / Math.max(srcW, srcH));
    const workW = Math.max(64, Math.round(srcW * scale));
    const workH = Math.max(64, Math.round(srcH * scale));

    this.rasterCanvas.width = workW;
    this.rasterCanvas.height = workH;
    const rCtx = this.rasterCanvas.getContext('2d', { willReadFrequently: true });
    rCtx.drawImage(this.sourceCanvas, 0, 0, workW, workH);

    const rawImageData = rCtx.getImageData(0, 0, workW, workH);
    this.lastRawImageData = rawImageData;

    // 2. Pre-process (blur, brightness, contrast, saturation)
    const processedData = VectorizerEngine.preprocessImageData(rawImageData, {
      blurRadius: Number(this.ctrlBlur.value),
      brightness: Number(this.ctrlBrightness.value),
      contrast: Number(this.ctrlContrast.value),
      saturation: Number(this.ctrlSaturation.value)
    });

    // 3. Execute selected vectorization algorithm
    let result;
    if (this.mode === 'color') {
      result = VectorizerEngine.vectorizeColor(processedData, {
        numColors: Number(this.ctrlNumColors.value),
        minArea: Number(this.ctrlDespeckle.value),
        simplifyTolerance: Number(this.ctrlSimplify.value),
        smoothing: Number(this.ctrlSmoothing.value),
        cornerThreshold: Number(this.ctrlCorners.value),
        layerStacking: this.ctrlStacking.value,
        strokeGapFix: Number(this.ctrlGapFix.value),
        customPalette: this.customPalette
      });
    } else if (this.mode === 'bw') {
      result = VectorizerEngine.vectorizeMonochrome(processedData, {
        bwMode: this.ctrlBwMode.value,
        threshold: Number(this.ctrlThreshold.value),
        invert: this.ctrlBwInvert.checked,
        minArea: Number(this.ctrlDespeckle.value),
        simplifyTolerance: Number(this.ctrlSimplify.value),
        smoothing: Number(this.ctrlSmoothing.value),
        cornerThreshold: Number(this.ctrlCorners.value),
        fgColor: this.ctrlFgColor.value,
        bgColor: this.ctrlBgColor.value,
        transparentBg: this.ctrlBwTrans.checked
      });
    } else {
      result = VectorizerEngine.vectorizeLowPoly(processedData, {
        pointCount: Number(this.ctrlPolyPoints.value),
        edgeWeight: Number(this.ctrlPolyEdge.value) / 100
      });
    }

    const elapsedMs = Math.round(performance.now() - t0);
    this.vectorResult = result;

    // 4. Mount SVG & update UI
    this.refreshSvgMarkupOnly(elapsedMs);
    this.renderPaletteInspector();

    if (fitAfter) {
      this.fitStageToViewport();
    } else {
      this.updateViewModeLayout();
    }
  }

  refreshSvgMarkupOnly(elapsedMs = null) {
    if (!this.vectorResult) return;

    this.currentSvgString = VectorizerEngine.buildSvgString(this.vectorResult, {
      wireframe: this.wireframe,
      showNodes: this.showNodes,
      strokeGapFix: Number(this.ctrlGapFix.value)
    });

    this.svgMount.innerHTML = this.currentSvgString;

    // Update bottom telemetry bar
    const { width, height, stats } = this.vectorResult;
    const activeColors =
      this.vectorResult.mode === 'lowpoly'
        ? stats.colors
        : this.vectorResult.layers.filter((l) => l.visible).length;

    // Recompute live fidelity if layers were hidden/recolored
    let fidelity = stats.fidelity;
    if (this.lastRawImageData && this.vectorResult.labels && this.vectorResult.mode !== 'lowpoly') {
      fidelity = VectorizerEngine.computeLayerFidelity(
        this.lastRawImageData,
        this.vectorResult.labels,
        this.vectorResult.layers,
        Number(this.ctrlSimplify.value),
        Number(this.ctrlSmoothing.value)
      );
      stats.fidelity = fidelity;
    }

    const svgBytes = new Blob([this.currentSvgString]).size;
    if (fidelity !== undefined) {
      this.statFidelity.textContent = `${fidelity}%`;
      this.fidelityBadge.textContent = `Match: ${fidelity}%`;
    }
    this.statDims.textContent = `${width} × ${height}`;
    this.statColors.textContent = activeColors.toLocaleString();
    this.statPaths.textContent = stats.paths.toLocaleString();
    this.statNodes.textContent = stats.nodes.toLocaleString();
    this.statSize.textContent = `${(svgBytes / 1024).toFixed(1)} KB`;
    if (elapsedMs !== null) {
      this.statTime.textContent = `${elapsedMs} ms`;
    }
  }

  renderPaletteInspector() {
    if (!this.vectorResult) return;

    if (this.vectorResult.mode === 'lowpoly') {
      this.paletteCountBadge.textContent = `${this.vectorResult.polygons.length} facets`;
      this.paletteList.innerHTML = `
        <div class="panel-helper" style="padding: 12px 4px;">
          Low-Poly mode colors each Delaunay triangle directly from its underlying raster pixels (${this.vectorResult.stats.colors} unique shades).
          Switch to <strong>Multi-Color</strong> mode for individual layer editing and merging.
        </div>
      `;
      this.btnMergeSelected.disabled = true;
      return;
    }

    const layers = this.vectorResult.layers;
    this.paletteCountBadge.textContent = `${layers.length} layers`;

    this.paletteList.innerHTML = layers
      .map((layer, idx) => {
        const pct = (layer.ratio * 100).toFixed(1);
        const isSelected = this.selectedLayerIds.has(layer.id);
        return `
        <div class="layer-card ${!layer.visible ? 'layer-hidden' : ''} ${isSelected ? 'layer-selected' : ''}" data-layer-id="${layer.id}">
          <input type="checkbox" class="layer-check" data-id="${layer.id}" ${isSelected ? 'checked' : ''} title="Select layer to merge" />
          <label class="swatch-wrapper" style="background: ${layer.hex};" title="Click to change layer color">
            <input type="color" class="swatch-input" data-id="${layer.id}" value="${layer.hex}" />
          </label>
          <div class="layer-info">
            <div class="layer-hex">
              <span>${layer.hex.toUpperCase()}</span>
              ${idx === 0 ? '<span style="font-size:9px; color:#38bdf8; background:rgba(56,189,248,0.12); padding:1px 4px; border-radius:3px;">BASE</span>' : ''}
            </div>
            <div class="layer-sub">${pct}% area • ${layer.subpathCount} paths</div>
            <div class="layer-bar-track">
              <div class="layer-bar-fill" style="width: ${Math.max(4, pct)}%; background: ${layer.hex};"></div>
            </div>
          </div>
          <button type="button" class="btn-eye" data-id="${layer.id}" title="Toggle layer visibility">
            ${layer.visible ? '👁️' : '🚫'}
          </button>
        </div>
      `;
      })
      .join('');

    // Bind live color picker events
    this.paletteList.querySelectorAll('.swatch-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const id = Number(e.target.dataset.id);
        const newHex = e.target.value;
        const layer = this.vectorResult.layers.find((l) => l.id === id);
        if (layer) {
          layer.hex = newHex;
          const rgb = VectorizerEngine.hexToRgb(newHex);
          layer.r = rgb.r;
          layer.g = rgb.g;
          layer.b = rgb.b;
          const card = e.target.closest('.layer-card');
          card.querySelector('.swatch-wrapper').style.background = newHex;
          card.querySelector('.layer-hex span').textContent = newHex.toUpperCase();
          card.querySelector('.layer-bar-fill').style.background = newHex;
          this.refreshSvgMarkupOnly();
        }
      });
    });

    // Bind visibility eye buttons
    this.paletteList.querySelectorAll('.btn-eye').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const layer = this.vectorResult.layers.find((l) => l.id === id);
        if (layer) {
          layer.visible = !layer.visible;
          this.renderPaletteInspector();
          this.refreshSvgMarkupOnly();
        }
      });
    });

    // Bind merge checkboxes
    this.paletteList.querySelectorAll('.layer-check').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const id = Number(e.target.dataset.id);
        if (e.target.checked) {
          this.selectedLayerIds.add(id);
        } else {
          this.selectedLayerIds.delete(id);
        }
        this.updateMergeButtonState();
        e.target.closest('.layer-card').classList.toggle('layer-selected', e.target.checked);
      });
    });

    this.updateMergeButtonState();
  }

  updateMergeButtonState() {
    const count = this.selectedLayerIds.size;
    this.btnMergeSelected.textContent = `Merge Selected (${count})`;
    this.btnMergeSelected.disabled = count < 2;
  }

  mergeSelectedLayers() {
    if (!this.vectorResult || this.selectedLayerIds.size < 2) return;

    const remaining = [];
    let targetLayer = null;

    for (const layer of this.vectorResult.layers) {
      if (this.selectedLayerIds.has(layer.id)) {
        if (!targetLayer) {
          targetLayer = { ...layer };
          remaining.push(targetLayer);
        }
      } else {
        remaining.push({ ...layer });
      }
    }

    this.customPalette = remaining.map((l, idx) => ({
      id: idx,
      r: l.r,
      g: l.g,
      b: l.b,
      hex: l.hex,
      visible: l.visible
    }));

    this.selectedLayerIds.clear();
    this.ctrlNumColors.value = this.customPalette.length;
    this.valNumColors.textContent = this.customPalette.length;
    this.runVectorization(false);
    this.showToast('Merged selected color layers!');
  }

  updateViewModeLayout() {
    if (!this.vectorResult) return;
    const { width, height } = this.vectorResult;

    this.canvasStage.classList.toggle('dual-mode', this.viewMode === 'side');
    this.onionBar.classList.toggle('hidden', this.viewMode !== 'onion');
    this.splitDivider.classList.toggle('hidden', this.viewMode !== 'split');

    if (this.viewMode === 'side') {
      this.canvasStage.style.width = `${width * 2 + 16}px`;
      this.canvasStage.style.height = `${height}px`;
      this.layerRaster.style.clipPath = 'none';
      this.layerVector.style.clipPath = 'none';
      this.layerRaster.style.opacity = '1';
      this.layerVector.style.opacity = '1';
      this.tagRaster.classList.remove('hidden');
      this.tagVector.classList.remove('hidden');
    } else {
      this.canvasStage.style.width = `${width}px`;
      this.canvasStage.style.height = `${height}px`;

      if (this.viewMode === 'split') {
        const pct = (this.splitPosition * 100).toFixed(2);
        this.splitDivider.style.left = `${pct}%`;
        this.layerRaster.style.opacity = '1';
        this.layerVector.style.opacity = '1';
        this.layerRaster.style.clipPath = `inset(0 ${100 - this.splitPosition * 100}% 0 0)`;
        this.layerVector.style.clipPath = `inset(0 0 0 ${pct}%)`;
        this.tagRaster.classList.remove('hidden');
        this.tagVector.classList.remove('hidden');
      } else if (this.viewMode === 'vector') {
        this.layerRaster.style.opacity = '0';
        this.layerVector.style.opacity = '1';
        this.layerVector.style.clipPath = 'none';
        this.tagRaster.classList.add('hidden');
        this.tagVector.classList.remove('hidden');
      } else if (this.viewMode === 'onion') {
        const op = Number(this.ctrlOnionOpacity.value) / 100;
        this.layerRaster.style.opacity = '1';
        this.layerRaster.style.clipPath = 'none';
        this.layerVector.style.clipPath = 'none';
        this.layerVector.style.opacity = String(op);
        this.tagRaster.classList.remove('hidden');
        this.tagVector.classList.remove('hidden');
      }
    }
  }

  fitStageToViewport() {
    if (!this.vectorResult) return;
    this.updateViewModeLayout();

    const vw = this.viewport.clientWidth - 64;
    const vh = this.viewport.clientHeight - 80;
    const sw = this.viewMode === 'side' ? this.vectorResult.width * 2 + 16 : this.vectorResult.width;
    const sh = this.vectorResult.height;

    this.zoom = Math.max(0.25, Math.min(2.5, Math.min(vw / sw, vh / sh)));
    this.panX = 0;
    this.panY = 0;
    this.applyViewportTransform();
  }

  applyViewportTransform() {
    this.canvasStage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.zoomReadout.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  downloadSvg() {
    if (!this.currentSvgString) return;
    const blob = new Blob([this.currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sourceName}-${this.mode}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.showToast('Downloaded SVG file!');
  }

  exportPng(scale = 2) {
    if (!this.currentSvgString || !this.vectorResult) return;
    const w = this.vectorResult.width * scale;
    const h = this.vectorResult.height * scale;
    const blob = new Blob([this.currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = w;
      outCanvas.height = h;
      const ctx = outCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      outCanvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${this.sourceName}-vector-${scale}x.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(pngUrl);
        this.showToast(`Exported ${w}×${h} PNG!`);
      }, 'image/png');
    };
    img.src = url;
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.add('hidden');
    }, 2200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.raster2VectorApp = new Raster2VectorApp();
});
