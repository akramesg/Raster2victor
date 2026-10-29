/**
 * Raster2Vector - Core Image Processing & Vectorization Algorithms
 * Includes:
 *  - Pre-processing (Gaussian Blur, Brightness/Contrast/Saturation)
 *  - Perceptual K-Means++ Color Quantization
 *  - Connected-Component Despeckling (Turdsize / Island removal)
 *  - Sub-pixel Marching Squares Contour Tracing (with Outer & Hole hierarchy)
 *  - Ramer-Douglas-Peucker (RDP) Polyline Simplification
 *  - Corner-aware Cubic Bézier Spline Fitting
 *  - Monochrome Threshold, Adaptive Threshold, and Sobel Edge Tracing
 *  - Edge-weighted Bowyer-Watson Delaunay Triangulation for Low-Poly Meshes
 */

export class VectorizerEngine {
  /**
   * Apply brightness, contrast, saturation, and separable box/Gaussian blur
   */
  static preprocessImageData(srcImageData, options = {}) {
    const {
      blurRadius = 0,
      brightness = 0, // -100 to 100
      contrast = 0,   // -100 to 100
      saturation = 0, // -100 to 100
    } = options;

    const width = srcImageData.width;
    const height = srcImageData.height;
    let data = new Uint8ClampedArray(srcImageData.data);

    // 1. Color adjustments
    if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
      const bOffset = (brightness / 100) * 255;
      const cFactor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
      const sFactor = 1 + saturation / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r += bOffset;
        g += bOffset;
        b += bOffset;

        // Contrast
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;

        // Saturation
        if (saturation !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * sFactor;
          g = gray + (g - gray) * sFactor;
          b = gray + (b - gray) * sFactor;
        }

        data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
    }

    // 2. Separable Gaussian-like Blur (2 passes of box blur)
    if (blurRadius > 0) {
      const r = Math.max(1, Math.round(blurRadius));
      data = this.boxBlur(data, width, height, r);
      data = this.boxBlur(data, width, height, r);
    }

    return new ImageData(data, width, height);
  }

  static boxBlur(data, width, height, radius) {
    const out = new Uint8ClampedArray(data.length);
    const temp = new Uint8ClampedArray(data.length);
    const diam = radius * 2 + 1;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      const rowOffset = y * width * 4;

      for (let i = -radius; i <= radius; i++) {
        const x = Math.min(width - 1, Math.max(0, i));
        const idx = rowOffset + x * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        aSum += data[idx + 3];
      }

      for (let x = 0; x < width; x++) {
        const outIdx = rowOffset + x * 4;
        temp[outIdx] = rSum / diam;
        temp[outIdx + 1] = gSum / diam;
        temp[outIdx + 2] = bSum / diam;
        temp[outIdx + 3] = aSum / diam;

        const leftX = Math.max(0, x - radius);
        const rightX = Math.min(width - 1, x + radius + 1);
        const leftIdx = rowOffset + leftX * 4;
        const rightIdx = rowOffset + rightX * 4;

        rSum += data[rightIdx] - data[leftIdx];
        gSum += data[rightIdx + 1] - data[leftIdx + 1];
        bSum += data[rightIdx + 2] - data[leftIdx + 2];
        aSum += data[rightIdx + 3] - data[leftIdx + 3];
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let i = -radius; i <= radius; i++) {
        const y = Math.min(height - 1, Math.max(0, i));
        const idx = (y * width + x) * 4;
        rSum += temp[idx];
        gSum += temp[idx + 1];
        bSum += temp[idx + 2];
        aSum += temp[idx + 3];
      }

      for (let y = 0; y < height; y++) {
        const outIdx = (y * width + x) * 4;
        out[outIdx] = rSum / diam;
        out[outIdx + 1] = gSum / diam;
        out[outIdx + 2] = bSum / diam;
        out[outIdx + 3] = aSum / diam;

        const topY = Math.max(0, y - radius);
        const botY = Math.min(height - 1, y + radius + 1);
        const topIdx = (topY * width + x) * 4;
        const botIdx = (botY * width + x) * 4;

        rSum += temp[botIdx] - temp[topIdx];
        gSum += temp[botIdx + 1] - temp[topIdx + 1];
        bSum += temp[botIdx + 2] - temp[topIdx + 2];
        aSum += temp[botIdx + 3] - temp[topIdx + 3];
      }
    }

    return out;
  }

  /**
   * Perceptual color distance (Redmean weighted RGB approximation)
   */
  static colorDistSq(r1, g1, b1, r2, g2, b2) {
    const rmean = (r1 + r2) * 0.5;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db;
  }

  /**
   * Quantize image into K colors using deterministic K-Means++ initialization
   * Returns { labels: Int32Array(w*h), palette: Array<{r,g,b,a,hex,count}> }
   */
  static quantizeColors(imageData, numColors = 8, customPalette = null) {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const labels = new Int32Array(totalPixels);

    // If user provided an existing/edited palette to map against
    if (customPalette && customPalette.length > 0) {
      const k = customPalette.length;
      const counts = new Int32Array(k);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        if (data[idx + 3] < 40) {
          labels[i] = -1; // Transparent
          continue;
        }
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        let bestCluster = 0;
        let minDist = Infinity;
        for (let c = 0; c < k; c++) {
          const d = this.colorDistSq(r, g, b, customPalette[c].r, customPalette[c].g, customPalette[c].b);
          if (d < minDist) {
            minDist = d;
            bestCluster = c;
          }
        }
        labels[i] = bestCluster;
        counts[bestCluster]++;
      }
      const palette = customPalette.map((p, idx) => ({
        ...p,
        count: counts[idx],
        ratio: counts[idx] / totalPixels
      }));
      return { labels, palette };
    }

    // Sample pixels for fast K-Means++ initialization and iterations
    const sampleStep = Math.max(1, Math.floor(totalPixels / 12000));
    const samples = [];
    for (let i = 0; i < totalPixels; i += sampleStep) {
      const idx = i * 4;
      if (data[idx + 3] >= 40) {
        samples.push(data[idx], data[idx + 1], data[idx + 2]);
      }
    }

    const numSamples = samples.length / 3;
    if (numSamples === 0) {
      return { labels: labels.fill(-1), palette: [] };
    }

    const k = Math.min(numColors, numSamples);
    const centroids = new Float64Array(k * 3);

    // K-Means++ deterministic seeding
    // Pick first centroid from middle sample
    const firstIdx = Math.floor(numSamples / 2) * 3;
    centroids[0] = samples[firstIdx];
    centroids[1] = samples[firstIdx + 1];
    centroids[2] = samples[firstIdx + 2];

    const minDistSq = new Float64Array(numSamples).fill(Infinity);

    for (let c = 1; c < k; c++) {
      let totalDist = 0;
      const prevC = (c - 1) * 3;
      const cr = centroids[prevC], cg = centroids[prevC + 1], cb = centroids[prevC + 2];

      for (let s = 0; s < numSamples; s++) {
        const sIdx = s * 3;
        const d = this.colorDistSq(samples[sIdx], samples[sIdx + 1], samples[sIdx + 2], cr, cg, cb);
        if (d < minDistSq[s]) minDistSq[s] = d;
        totalDist += minDistSq[s];
      }

      // Deterministic pseudo-random threshold based on golden ratio
      const target = totalDist * (((c * 0.61803398875) % 1) * 0.7 + 0.15);
      let accum = 0;
      let chosen = numSamples - 1;
      for (let s = 0; s < numSamples; s++) {
        accum += minDistSq[s];
        if (accum >= target) {
          chosen = s;
          break;
        }
      }

      centroids[c * 3] = samples[chosen * 3];
      centroids[c * 3 + 1] = samples[chosen * 3 + 1];
      centroids[c * 3 + 2] = samples[chosen * 3 + 2];
    }

    // Run K-Means iterations on samples
    const maxIter = 12;
    const sumR = new Float64Array(k);
    const sumG = new Float64Array(k);
    const sumB = new Float64Array(k);
    const counts = new Int32Array(k);

    for (let iter = 0; iter < maxIter; iter++) {
      sumR.fill(0);
      sumG.fill(0);
      sumB.fill(0);
      counts.fill(0);

      for (let s = 0; s < numSamples; s++) {
        const sIdx = s * 3;
        const r = samples[sIdx], g = samples[sIdx + 1], b = samples[sIdx + 2];
        let bestC = 0;
        let bestD = Infinity;

        for (let c = 0; c < k; c++) {
          const cIdx = c * 3;
          const d = this.colorDistSq(r, g, b, centroids[cIdx], centroids[cIdx + 1], centroids[cIdx + 2]);
          if (d < bestD) {
            bestD = d;
            bestC = c;
          }
        }

        sumR[bestC] += r;
        sumG[bestC] += g;
        sumB[bestC] += b;
        counts[bestC]++;
      }

      let maxShift = 0;
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          const nr = sumR[c] / counts[c];
          const ng = sumG[c] / counts[c];
          const nb = sumB[c] / counts[c];
          const cIdx = c * 3;
          const shift = Math.abs(nr - centroids[cIdx]) + Math.abs(ng - centroids[cIdx + 1]) + Math.abs(nb - centroids[cIdx + 2]);
          if (shift > maxShift) maxShift = shift;
          centroids[cIdx] = nr;
          centroids[cIdx + 1] = ng;
          centroids[cIdx + 2] = nb;
        }
      }
      if (maxShift < 1.0) break;
    }

    // Assign all pixels to nearest centroid
    const fullCounts = new Int32Array(k);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (data[idx + 3] < 40) {
        labels[i] = -1;
        continue;
      }
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const cIdx = c * 3;
        const d = this.colorDistSq(r, g, b, centroids[cIdx], centroids[cIdx + 1], centroids[cIdx + 2]);
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
      }
      labels[i] = bestC;
      fullCounts[bestC]++;
    }

    // Sort palette from most dominant / background to foreground (or by luminance)
    const rawClusters = [];
    for (let c = 0; c < k; c++) {
      const r = Math.round(centroids[c * 3]);
      const g = Math.round(centroids[c * 3 + 1]);
      const b = Math.round(centroids[c * 3 + 2]);
      rawClusters.push({
        oldIndex: c,
        r, g, b,
        hex: this.rgbToHex(r, g, b),
        count: fullCounts[c],
        ratio: fullCounts[c] / totalPixels,
        luminance: 0.299 * r + 0.587 * g + 0.114 * b,
        visible: true
      });
    }

    // Sort by area descending so largest layers are drawn first (bottom)
    rawClusters.sort((a, b) => b.count - a.count);

    const remap = new Int32Array(k);
    const palette = rawClusters.map((item, newIdx) => {
      remap[item.oldIndex] = newIdx;
      return {
        id: newIdx,
        r: item.r,
        g: item.g,
        b: item.b,
        hex: item.hex,
        count: item.count,
        ratio: item.ratio,
        luminance: item.luminance,
        visible: true
      };
    });

    for (let i = 0; i < totalPixels; i++) {
      if (labels[i] >= 0) {
        labels[i] = remap[labels[i]];
      }
    }

    return { labels, palette };
  }

  /**
   * Connected-components despeckling: absorbs small isolated color regions (< minArea pixels)
   * into their most frequent adjacent neighbor label.
   */
  static despeckleLabels(labels, width, height, minArea = 16) {
    if (minArea <= 1) return labels;

    const total = width * height;
    const out = new Int32Array(labels);
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);

    // Run 2 passes (tiny islands first, then slightly larger up to minArea)
    const thresholds = minArea > 8 ? [Math.ceil(minArea / 3), minArea] : [minArea];

    for (const thresh of thresholds) {
      visited.fill(0);

      for (let i = 0; i < total; i++) {
        if (visited[i] || out[i] < 0) continue;

        const targetLabel = out[i];
        let head = 0, tail = 0;
        queue[tail++] = i;
        visited[i] = 1;

        const neighborCounts = new Map();

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = (curr - cx) / width;

          // 4-connected neighbors
          const neighbors = [];
          if (cx > 0) neighbors.push(curr - 1);
          if (cx < width - 1) neighbors.push(curr + 1);
          if (cy > 0) neighbors.push(curr - width);
          if (cy < height - 1) neighbors.push(curr + width);

          for (let n = 0; n < neighbors.length; n++) {
            const nIdx = neighbors[n];
            const nLabel = out[nIdx];
            if (nLabel === targetLabel) {
              if (!visited[nIdx]) {
                visited[nIdx] = 1;
                queue[tail++] = nIdx;
              }
            } else if (nLabel >= 0) {
              neighborCounts.set(nLabel, (neighborCounts.get(nLabel) || 0) + 1);
            }
          }
        }

        // If component is smaller than threshold, merge into most common neighbor
        if (tail < thresh && neighborCounts.size > 0) {
          let bestNeighbor = -1;
          let maxBorder = -1;
          for (const [nLabel, borderCount] of neighborCounts.entries()) {
            if (borderCount > maxBorder) {
              maxBorder = borderCount;
              bestNeighbor = nLabel;
            }
          }
          if (bestNeighbor >= 0) {
            for (let j = 0; j < tail; j++) {
              out[queue[j]] = bestNeighbor;
            }
          }
        }
      }
    }

    return out;
  }

  /**
   * Trace binary mask (Uint8Array of 0 and 1) into closed polygon loops using Marching Squares
   * Returns Array of closed loops: Array<Array<{x, y}>>
   */
  static traceBinaryMask(mask, width, height, minLoopLength = 6) {
    // Pad grid by 1 pixel on all sides so boundaries always close cleanly
    const pw = width + 2;
    const ph = height + 2;
    const padded = new Uint8Array(pw * ph);

    for (let y = 0; y < height; y++) {
      const srcRow = y * width;
      const dstRow = (y + 1) * pw + 1;
      for (let x = 0; x < width; x++) {
        padded[dstRow + x] = mask[srcRow + x];
      }
    }

    // Directed edge map for cell corners (x, y) in [0..pw-2] x [0..ph-2]
    // Each cell has 4 sides: 0=Top, 1=Right, 2=Bottom, 3=Left
    // We store outgoing segment segments in a spatial hash or adjacency list of grid midpoints
    // Midpoint coordinates are doubled integers:
    // Top midpoint of cell (x,y): (2*x + 1, 2*y)
    // Right midpoint of cell (x,y): (2*x + 2, 2*y + 1)
    // Bottom midpoint of cell (x,y): (2*x + 1, 2*y + 2)
    // Left midpoint of cell (x,y): (2*x, 2*y + 1)
    const stride = pw * 2 + 2;
    const nextMap = new Map();

    const addEdge = (x1, y1, x2, y2) => {
      const k1 = y1 * stride + x1;
      const k2 = y2 * stride + x2;
      if (!nextMap.has(k1)) {
        nextMap.set(k1, k2);
      } else {
        // Saddle point disambiguation: store secondary outgoing edge
        const existing = nextMap.get(k1);
        if (typeof existing === 'number') {
          nextMap.set(k1, [existing, k2]);
        } else {
          existing.push(k2);
        }
      }
    };

    for (let y = 0; y < ph - 1; y++) {
      const row0 = y * pw;
      const row1 = (y + 1) * pw;
      for (let x = 0; x < pw - 1; x++) {
        const tl = padded[row0 + x];
        const tr = padded[row0 + x + 1];
        const br = padded[row1 + x + 1];
        const bl = padded[row1 + x];

        const code = (tl << 3) | (tr << 2) | (br << 1) | bl;
        if (code === 0 || code === 15) continue;

        const tx = 2 * x + 1, ty = 2 * y;
        const rx = 2 * x + 2, ry = 2 * y + 1;
        const bx = 2 * x + 1, by = 2 * y + 2;
        const lx = 2 * x,     ly = 2 * y + 1;

        // Clockwise contour around 1-regions
        switch (code) {
          case 1:  addEdge(bx, by, lx, ly); break;
          case 2:  addEdge(rx, ry, bx, by); break;
          case 3:  addEdge(rx, ry, lx, ly); break;
          case 4:  addEdge(tx, ty, rx, ry); break;
          case 5:
            // Saddle
            addEdge(tx, ty, lx, ly);
            addEdge(rx, ry, bx, by);
            break;
          case 6:  addEdge(tx, ty, bx, by); break;
          case 7:  addEdge(tx, ty, lx, ly); break;
          case 8:  addEdge(lx, ly, tx, ty); break;
          case 9:  addEdge(bx, by, tx, ty); break;
          case 10:
            // Saddle
            addEdge(lx, ly, bx, by);
            addEdge(tx, ty, rx, ry);
            break;
          case 11: addEdge(rx, ry, tx, ty); break;
          case 12: addEdge(lx, ly, rx, ry); break;
          case 13: addEdge(bx, by, rx, ry); break;
          case 14: addEdge(lx, ly, bx, by); break;
        }
      }
    }

    const loops = [];

    for (const [startKey] of nextMap.entries()) {
      while (nextMap.has(startKey)) {
        const loop = [];
        let curr = startKey;

        while (curr !== undefined) {
          const ky = Math.floor(curr / stride);
          const kx = curr - ky * stride;
          // Convert doubled padded coords back to image pixel coordinates
          loop.push({
            x: kx * 0.5 - 1,
            y: ky * 0.5 - 1
          });

          const entry = nextMap.get(curr);
          if (entry === undefined) break;

          let next;
          if (typeof entry === 'number') {
            next = entry;
            nextMap.delete(curr);
          } else {
            next = entry.pop();
            if (entry.length === 0) nextMap.delete(curr);
          }

          if (next === startKey) break;
          curr = next;
        }

        if (loop.length >= minLoopLength) {
          loops.push(loop);
        }
      }
    }

    return loops;
  }

  /**
   * Ramer-Douglas-Peucker simplification for a closed polygon loop
   */
  static simplifyClosedLoop(points, tolerance = 1.0) {
    if (points.length <= 4 || tolerance <= 0.05) return points;

    // Find two farthest points to split closed loop into two open chains
    let maxDistSq = -1;
    let splitA = 0;
    let splitB = Math.floor(points.length / 2);

    const step = Math.max(1, Math.floor(points.length / 40));
    for (let i = 0; i < points.length; i += step) {
      const p1 = points[i];
      for (let j = i + 1; j < points.length; j += step) {
        const p2 = points[j];
        const d = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
        if (d > maxDistSq) {
          maxDistSq = d;
          splitA = i;
          splitB = j;
        }
      }
    }

    if (splitA > splitB) {
      const t = splitA;
      splitA = splitB;
      splitB = t;
    }

    const chain1 = points.slice(splitA, splitB + 1);
    const chain2 = [...points.slice(splitB), ...points.slice(0, splitA + 1)];

    const simp1 = this.rdpOpen(chain1, tolerance);
    const simp2 = this.rdpOpen(chain2, tolerance);

    const combined = [...simp1.slice(0, -1), ...simp2.slice(0, -1)];
    return combined.length >= 3 ? combined : points.slice(0, 3);
  }

  static rdpOpen(pts, epsilon) {
    if (pts.length <= 2) return pts;
    const epsSq = epsilon * epsilon;
    const keep = new Uint8Array(pts.length);
    keep[0] = 1;
    keep[pts.length - 1] = 1;

    const stack = [[0, pts.length - 1]];
    while (stack.length > 0) {
      const [first, last] = stack.pop();
      if (last - first <= 1) continue;

      let maxDistSq = 0;
      let index = first;
      const p1 = pts[first];
      const p2 = pts[last];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;

      for (let i = first + 1; i < last; i++) {
        const p = pts[i];
        let dSq;
        if (lenSq === 0) {
          dSq = (p.x - p1.x) ** 2 + (p.y - p1.y) ** 2;
        } else {
          let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const projX = p1.x + t * dx;
          const projY = p1.y + t * dy;
          dSq = (p.x - projX) ** 2 + (p.y - projY) ** 2;
        }
        if (dSq > maxDistSq) {
          maxDistSq = dSq;
          index = i;
        }
      }

      if (maxDistSq > epsSq) {
        keep[index] = 1;
        stack.push([first, index], [index, last]);
      }
    }

    const result = [];
    for (let i = 0; i < pts.length; i++) {
      if (keep[i]) result.push(pts[i]);
    }
    return result;
  }

  /**
   * Optional pre-smoothing of staircase vertices before RDP (Laplacian / Chaikin relaxation)
   */
  static relaxClosedLoop(points, iterations = 1, strength = 0.45) {
    let curr = points;
    const n = curr.length;
    if (n < 4 || iterations <= 0) return curr;

    for (let iter = 0; iter < iterations; iter++) {
      const next = new Array(n);
      for (let i = 0; i < n; i++) {
        const prev = curr[(i - 1 + n) % n];
        const p = curr[i];
        const nxt = curr[(i + 1) % n];
        next[i] = {
          x: p.x * (1 - strength) + (prev.x + nxt.x) * 0.5 * strength,
          y: p.y * (1 - strength) + (prev.y + nxt.y) * 0.5 * strength
        };
      }
      curr = next;
    }
    return curr;
  }

  /**
   * Convert a simplified closed polygon into an SVG path subpath (`M ... C ... Z`)
   * Respects sharp corners via `cornerThresholdDeg` and smooths curves via `smoothing` (0 to 1.2)
   */
  static loopToSvgSubpath(points, smoothing = 0.65, cornerThresholdDeg = 55, precision = 1) {
    const n = points.length;
    if (n < 3) return '';

    const fmt = (v) => Number(v.toFixed(precision));

    // If smoothing is 0, output crisp polygon lines
    if (smoothing <= 0.01) {
      let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
      for (let i = 1; i < n; i++) {
        d += ` L ${fmt(points[i].x)} ${fmt(points[i].y)}`;
      }
      return d + ' Z';
    }

    // Detect sharp corners based on turning angle
    const isCorner = new Uint8Array(n);
    const cosThresh = Math.cos((cornerThresholdDeg * Math.PI) / 180);

    for (let i = 0; i < n; i++) {
      const pPrev = points[(i - 1 + n) % n];
      const pCurr = points[i];
      const pNext = points[(i + 1) % n];

      const v1x = pCurr.x - pPrev.x;
      const v1y = pCurr.y - pPrev.y;
      const v2x = pNext.x - pCurr.x;
      const v2y = pNext.y - pCurr.y;

      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      if (len1 < 1e-4 || len2 < 1e-4) {
        isCorner[i] = 1;
        continue;
      }

      // Cosine of exterior turning angle (1 = straight line, 0 = 90 deg turn, <0 = hairpin)
      const cosAngle = (v1x * v2x + v1y * v2y) / (len1 * len2);
      if (cosAngle < cosThresh) {
        isCorner[i] = 1;
      }
    }

    // Catmull-Rom to Cubic Bezier conversion with corner clamping
    const tension = smoothing * 0.25;
    let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;

    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];

      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxHandle = segLen * 0.45;

      let cp1x = p1.x, cp1y = p1.y;
      if (!isCorner[i]) {
        let tx = (p2.x - p0.x) * tension;
        let ty = (p2.y - p0.y) * tension;
        const tLen = Math.hypot(tx, ty);
        if (tLen > maxHandle && tLen > 0) {
          tx = (tx / tLen) * maxHandle;
          ty = (ty / tLen) * maxHandle;
        }
        cp1x = p1.x + tx;
        cp1y = p1.y + ty;
      }

      let cp2x = p2.x, cp2y = p2.y;
      if (!isCorner[(i + 1) % n]) {
        let tx = (p3.x - p1.x) * tension;
        let ty = (p3.y - p1.y) * tension;
        const tLen = Math.hypot(tx, ty);
        if (tLen > maxHandle && tLen > 0) {
          tx = (tx / tLen) * maxHandle;
          ty = (ty / tLen) * maxHandle;
        }
        cp2x = p2.x - tx;
        cp2y = p2.y - ty;
      }

      if (isCorner[i] && isCorner[(i + 1) % n]) {
        d += ` L ${fmt(p2.x)} ${fmt(p2.y)}`;
      } else {
        d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
      }
    }

    return d + ' Z';
  }

  /**
   * Full Multi-Color Vectorization Pipeline
   */
  static vectorizeColor(imageData, params = {}) {
    const {
      numColors = 8,
      minArea = 16,
      simplifyTolerance = 1.1,
      smoothing = 0.65,
      cornerThreshold = 55,
      layerStacking = 'cutout', // 'cutout' (exact adjacent + holes) or 'stacked' (overlapping hierarchy)
      strokeGapFix = 0.4,
      customPalette = null
    } = params;

    const { width, height } = imageData;
    const totalPixels = width * height;

    // 1. Quantize colors
    const { labels: rawLabels, palette } = this.quantizeColors(imageData, numColors, customPalette);

    // 2. Despeckle isolated tiny regions
    const labels = this.despeckleLabels(rawLabels, width, height, minArea);

    // Recalculate accurate pixel counts after despeckling
    for (let c = 0; c < palette.length; c++) palette[c].count = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (labels[i] >= 0 && labels[i] < palette.length) {
        palette[labels[i]].count++;
      }
    }

    // 3. Trace contours for each color layer
    const layers = [];
    let totalPaths = 0;
    let totalNodes = 0;
    const mask = new Uint8Array(totalPixels);

    const relaxPasses = smoothing > 0.3 ? 2 : 1;

    for (let c = 0; c < palette.length; c++) {
      const colorInfo = palette[c];
      if (colorInfo.count === 0) continue;

      if (layerStacking === 'stacked') {
        // Hierarchical stacking: layer c includes all pixels of layer >= c so bottom layers fill underneath upper layers (zero seams!)
        for (let i = 0; i < totalPixels; i++) {
          mask[i] = labels[i] >= c ? 1 : 0;
        }
      } else {
        // Exact cutout per color layer
        for (let i = 0; i < totalPixels; i++) {
          mask[i] = labels[i] === c ? 1 : 0;
        }
      }

      const rawLoops = this.traceBinaryMask(mask, width, height, 6);
      if (rawLoops.length === 0) continue;

      const subpaths = [];
      const simplifiedLoops = [];
      let layerNodes = 0;

      for (let l = 0; l < rawLoops.length; l++) {
        const relaxed = this.relaxClosedLoop(rawLoops[l], relaxPasses, 0.42);
        const simplified = this.simplifyClosedLoop(relaxed, simplifyTolerance);
        if (simplified.length < 3) continue;

        const d = this.loopToSvgSubpath(simplified, smoothing, cornerThreshold, 1);
        if (d) {
          subpaths.push(d);
          simplifiedLoops.push(simplified);
          layerNodes += simplified.length;
        }
      }

      if (subpaths.length > 0) {
        totalPaths += subpaths.length;
        totalNodes += layerNodes;
        layers.push({
          id: c,
          hex: colorInfo.hex,
          r: colorInfo.r,
          g: colorInfo.g,
          b: colorInfo.b,
          visible: colorInfo.visible !== false,
          pathData: subpaths.join(' '),
          loops: simplifiedLoops,
          subpathCount: subpaths.length,
          nodeCount: layerNodes,
          pixelCount: colorInfo.count,
          ratio: colorInfo.count / totalPixels
        });
      }
    }

    const fidelity = this.computeLayerFidelity(imageData, labels, layers, simplifyTolerance, smoothing);

    return {
      mode: 'color',
      width,
      height,
      palette,
      layers,
      labels,
      strokeGapFix,
      stats: {
        colors: layers.length,
        paths: totalPaths,
        nodes: totalNodes,
        fidelity
      }
    };
  }

  /**
   * Monochrome / Black & White / Edge Tracing Pipeline
   */
  static vectorizeMonochrome(imageData, params = {}) {
    const {
      bwMode = 'threshold', // 'threshold' | 'adaptive' | 'edges'
      threshold = 128,
      invert = false,
      minArea = 12,
      simplifyTolerance = 1.0,
      smoothing = 0.6,
      cornerThreshold = 55,
      fgColor = '#111827',
      bgColor = '#ffffff',
      transparentBg = false
    } = params;

    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const gray = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const alpha = data[idx + 3] / 255;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      gray[i] = lum * alpha + 255 * (1 - alpha);
    }

    const labels = new Int32Array(totalPixels);

    if (bwMode === 'threshold') {
      for (let i = 0; i < totalPixels; i++) {
        const isDark = gray[i] < threshold;
        labels[i] = (invert ? !isDark : isDark) ? 1 : 0;
      }
    } else if (bwMode === 'adaptive') {
      // Integral image for fast local mean thresholding
      const integral = new Float64Array((width + 1) * (height + 1));
      const iw = width + 1;
      for (let y = 1; y <= height; y++) {
        let rowSum = 0;
        for (let x = 1; x <= width; x++) {
          rowSum += gray[(y - 1) * width + (x - 1)];
          integral[y * iw + x] = integral[(y - 1) * iw + x] + rowSum;
        }
      }

      const radius = Math.max(8, Math.round(Math.min(width, height) / 24));
      const bias = (threshold - 128) * 0.35;

      for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - radius);
        const y1 = Math.min(height, y + radius + 1);
        for (let x = 0; x < width; x++) {
          const x0 = Math.max(0, x - radius);
          const x1 = Math.min(width, x + radius + 1);
          const area = (x1 - x0) * (y1 - y0);
          const sum = integral[y1 * iw + x1] - integral[y0 * iw + x1] - integral[y1 * iw + x0] + integral[y0 * iw + x0];
          const localMean = sum / area;
          const isDark = gray[y * width + x] < localMean + bias - 6;
          labels[y * width + x] = (invert ? !isDark : isDark) ? 1 : 0;
        }
      }
    } else if (bwMode === 'edges') {
      // Sobel gradient magnitude edge detection
      const edgeThresh = Math.max(10, 265 - threshold);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = y * width + x;
          const gx =
            -gray[i - width - 1] + gray[i - width + 1] -
            2 * gray[i - 1] + 2 * gray[i + 1] -
            gray[i + width - 1] + gray[i + width + 1];
          const gy =
            -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
            gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
          const mag = Math.hypot(gx, gy);
          const isEdge = mag > edgeThresh;
          labels[i] = (invert ? !isEdge : isEdge) ? 1 : 0;
        }
      }
    }

    const cleanedLabels = this.despeckleLabels(labels, width, height, minArea);
    const mask = new Uint8Array(totalPixels);
    let fgPixels = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (cleanedLabels[i] === 1) {
        mask[i] = 1;
        fgPixels++;
      }
    }

    const rawLoops = this.traceBinaryMask(mask, width, height, 6);
    const subpaths = [];
    const simplifiedLoops = [];
    let totalNodes = 0;

    for (let l = 0; l < rawLoops.length; l++) {
      const relaxed = this.relaxClosedLoop(rawLoops[l], smoothing > 0.3 ? 2 : 1, 0.42);
      const simplified = this.simplifyClosedLoop(relaxed, simplifyTolerance);
      if (simplified.length < 3) continue;
      const d = this.loopToSvgSubpath(simplified, smoothing, cornerThreshold, 1);
      if (d) {
        subpaths.push(d);
        simplifiedLoops.push(simplified);
        totalNodes += simplified.length;
      }
    }

    const layers = [];
    if (!transparentBg) {
      layers.push({
        id: 0,
        hex: bgColor,
        visible: true,
        isBackgroundRect: true,
        pathData: `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`,
        loops: [[{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]],
        subpathCount: 1,
        nodeCount: 4,
        pixelCount: totalPixels - fgPixels,
        ratio: (totalPixels - fgPixels) / totalPixels
      });
    }

    layers.push({
      id: 1,
      hex: fgColor,
      visible: true,
      pathData: subpaths.join(' '),
      loops: simplifiedLoops,
      subpathCount: subpaths.length,
      nodeCount: totalNodes,
      pixelCount: fgPixels,
      ratio: fgPixels / totalPixels
    });

    const palette = layers.map((l) => ({
      id: l.id,
      hex: l.hex,
      visible: l.visible,
      count: l.pixelCount,
      ratio: l.ratio
    }));

    const fgRgb = this.hexToRgb(fgColor);
    const bgRgb = this.hexToRgb(bgColor);
    const bwLayersForFidelity = [
      { id: 0, r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, visible: !transparentBg },
      { id: 1, r: fgRgb.r, g: fgRgb.g, b: fgRgb.b, visible: true }
    ];
    const fidelity = this.computeLayerFidelity(imageData, cleanedLabels, bwLayersForFidelity, simplifyTolerance, smoothing);

    return {
      mode: 'bw',
      width,
      height,
      palette,
      layers,
      labels: cleanedLabels,
      strokeGapFix: 0,
      stats: {
        colors: layers.length,
        paths: subpaths.length,
        nodes: totalNodes,
        fidelity
      }
    };
  }

  /**
   * Low-Poly Geometric Triangulation Mode (Bowyer-Watson Delaunay + Edge-weighted Sampling)
   */
  static vectorizeLowPoly(imageData, params = {}) {
    const {
      pointCount = 800,
      edgeWeight = 0.7, // 0 = uniform grid/random, 1 = heavily concentrated on edges
      numColors = 0     // 0 = true average triangle color, >0 = quantized palette
    } = params;

    const { data, width, height } = imageData;
    const totalPixels = width * height;

    // 1. Compute Sobel edge magnitude for importance sampling
    const gray = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    const edgeMag = new Float32Array(totalPixels);
    let maxEdge = 1;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const gx = -gray[i - width - 1] + gray[i - width + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + width - 1] + gray[i + width + 1];
        const gy = -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] + gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
        const m = Math.hypot(gx, gy);
        edgeMag[i] = m;
        if (m > maxEdge) maxEdge = m;
      }
    }

    // 2. Generate vertices: corners + boundary points + interior edge-weighted points
    const vertices = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];

    const borderStep = Math.max(12, Math.round(Math.hypot(width, height) / Math.sqrt(pointCount) * 1.4));
    for (let x = borderStep; x < width - borderStep * 0.5; x += borderStep) {
      vertices.push({ x, y: 0 }, { x, y: height });
    }
    for (let y = borderStep; y < height - borderStep * 0.5; y += borderStep) {
      vertices.push({ x: 0, y }, { x: width, y });
    }

    // Deterministic Halton-like quasi-random sequence with rejection sampling
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const targetInterior = Math.max(20, pointCount - vertices.length);
    let attempts = 0;
    const maxAttempts = targetInterior * 25;

    while (vertices.length < pointCount && attempts < maxAttempts) {
      attempts++;
      const x = Math.floor(rand() * (width - 2)) + 1;
      const y = Math.floor(rand() * (height - 2)) + 1;
      const normEdge = edgeMag[y * width + x] / maxEdge;
      const prob = (1 - edgeWeight) * 0.35 + edgeWeight * Math.pow(normEdge, 0.75);
      if (rand() < prob) {
        vertices.push({ x, y });
      }
    }

    // 3. Bowyer-Watson Delaunay Triangulation
    const triangles = this.delaunayTriangulate(vertices, width, height);

    // 4. Sample color for each triangle (average of centroid + 3 midpoints toward vertices)
    const polygons = [];
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const p0 = vertices[t[0]];
      const p1 = vertices[t[1]];
      const p2 = vertices[t[2]];

      const cx = (p0.x + p1.x + p2.x) / 3;
      const cy = (p0.y + p1.y + p2.y) / 3;

      const samplePts = [
        [cx, cy],
        [(cx + p0.x) * 0.5, (cy + p0.y) * 0.5],
        [(cx + p1.x) * 0.5, (cy + p1.y) * 0.5],
        [(cx + p2.x) * 0.5, (cy + p2.y) * 0.5]
      ];

      let rSum = 0, gSum = 0, bSum = 0;
      for (let s = 0; s < samplePts.length; s++) {
        const sx = Math.min(width - 1, Math.max(0, Math.round(samplePts[s][0])));
        const sy = Math.min(height - 1, Math.max(0, Math.round(samplePts[s][1])));
        const idx = (sy * width + sx) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
      }

      const r = Math.round(rSum / samplePts.length);
      const g = Math.round(gSum / samplePts.length);
      const b = Math.round(bSum / samplePts.length);

      polygons.push({
        pts: [p0, p1, p2],
        r, g, b,
        hex: this.rgbToHex(r, g, b)
      });
    }

    // Compute Low-Poly perceptual fidelity by comparing triangle colors with their vertex/interior samples
    let errSumSq = 0;
    let sampleCount = 0;
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      for (let v = 0; v < 3; v++) {
        const vx = Math.min(width - 1, Math.max(0, Math.round(poly.pts[v].x)));
        const vy = Math.min(height - 1, Math.max(0, Math.round(poly.pts[v].y)));
        const idx = (vy * width + vx) * 4;
        errSumSq += this.colorDistSq(data[idx], data[idx + 1], data[idx + 2], poly.r, poly.g, poly.b);
        sampleCount++;
      }
    }
    const maxRedmeanSq = 9 * 255 * 255;
    const rmseNorm = sampleCount > 0 ? Math.sqrt(errSumSq / sampleCount / maxRedmeanSq) : 0;
    const fidelity = Number(Math.max(0, Math.min(99.9, (1 - rmseNorm * 1.15) * 100)).toFixed(1));

    return {
      mode: 'lowpoly',
      width,
      height,
      polygons,
      palette: [],
      layers: [],
      stats: {
        colors: new Set(polygons.map((p) => p.hex)).size,
        paths: polygons.length,
        nodes: vertices.length,
        fidelity
      }
    };
  }

  /**
   * Fast Bowyer-Watson Delaunay Triangulation
   */
  static delaunayTriangulate(points, width, height) {
    const n = points.length;
    const maxDim = Math.max(width, height) * 10;
    const superPts = [
      { x: -maxDim, y: -maxDim },
      { x: 3 * maxDim, y: -maxDim },
      { x: -maxDim, y: 3 * maxDim }
    ];

    const allPts = [...points, ...superPts];

    const createTri = (i, j, k) => {
      const a = allPts[i], b = allPts[j], c = allPts[k];
      const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y;
      const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      if (Math.abs(D) < 1e-8) {
        return { i, j, k, x: 0, y: 0, rSq: -1 };
      }
      const aSq = ax * ax + ay * ay;
      const bSq = bx * bx + by * by;
      const cSq = cx * cx + cy * cy;
      const ux = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / D;
      const uy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / D;
      const rSq = (ax - ux) ** 2 + (ay - uy) ** 2;
      return { i, j, k, x: ux, y: uy, rSq };
    };

    let triangles = [createTri(n, n + 1, n + 2)];

    for (let pIdx = 0; pIdx < n; pIdx++) {
      const p = allPts[pIdx];
      const badTriangles = [];
      const goodTriangles = [];

      for (let t = 0; t < triangles.length; t++) {
        const tri = triangles[t];
        if (tri.rSq < 0) continue;
        const distSq = (p.x - tri.x) ** 2 + (p.y - tri.y) ** 2;
        if (distSq <= tri.rSq) {
          badTriangles.push(tri);
        } else {
          goodTriangles.push(tri);
        }
      }

      // Find boundary of polygonal hole
      const edgeCounts = new Map();
      const edgePairs = new Map();

      const addEdge = (u, v) => {
        const min = u < v ? u : v;
        const max = u < v ? v : u;
        const key = min * 100000 + max;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        edgePairs.set(key, [u, v]);
      };

      for (let b = 0; b < badTriangles.length; b++) {
        const tri = badTriangles[b];
        addEdge(tri.i, tri.j);
        addEdge(tri.j, tri.k);
        addEdge(tri.k, tri.i);
      }

      for (const [key, count] of edgeCounts.entries()) {
        if (count === 1) {
          const [u, v] = edgePairs.get(key);
          const newTri = createTri(u, v, pIdx);
          if (newTri.rSq >= 0) {
            goodTriangles.push(newTri);
          }
        }
      }

      triangles = goodTriangles;
    }

    // Filter out triangles sharing vertices with super-triangle
    const result = [];
    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t];
      if (tri.i < n && tri.j < n && tri.k < n) {
        result.push([tri.i, tri.j, tri.k]);
      }
    }
    return result;
  }

  /**
   * Build final SVG markup string from vectorization result
   */
  static buildSvgString(result, options = {}) {
    const {
      wireframe = false,
      showNodes = false,
      strokeGapFix = result.strokeGapFix ?? 0.4
    } = options;

    const { width, height, mode } = result;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
    ];

    if (mode === 'lowpoly') {
      parts.push(`  <g id="lowpoly-mesh" stroke-linejoin="round">`);
      const fmt = (v) => Number(v.toFixed(1));
      for (let i = 0; i < result.polygons.length; i++) {
        const poly = result.polygons[i];
        const pts = poly.pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
        if (wireframe) {
          parts.push(`    <polygon points="${pts}" fill="none" stroke="${poly.hex}" stroke-width="1" />`);
        } else {
          parts.push(`    <polygon points="${pts}" fill="${poly.hex}" stroke="${poly.hex}" stroke-width="0.6" />`);
        }
      }
      parts.push(`  </g>`);
    } else {
      parts.push(`  <g id="vector-layers">`);
      for (let i = 0; i < result.layers.length; i++) {
        const layer = result.layers[i];
        if (!layer.visible || !layer.pathData) continue;

        if (wireframe) {
          parts.push(
            `    <path id="layer-${layer.id}" d="${layer.pathData}" fill="${layer.hex}" fill-opacity="0.16" fill-rule="evenodd" stroke="${layer.hex}" stroke-width="1.2" />`
          );
        } else {
          const strokeAttr =
            strokeGapFix > 0 && !layer.isBackgroundRect
              ? ` stroke="${layer.hex}" stroke-width="${strokeGapFix}" stroke-linejoin="round"`
              : '';
          parts.push(
            `    <path id="layer-${layer.id}" d="${layer.pathData}" fill="${layer.hex}" fill-rule="evenodd"${strokeAttr} />`
          );
        }
      }
      parts.push(`  </g>`);

      if (showNodes) {
        parts.push(`  <g id="anchor-nodes" fill="#38bdf8" stroke="#0f172a" stroke-width="0.8">`);
        const r = Math.max(1.4, Math.min(width, height) / 260);
        for (let i = 0; i < result.layers.length; i++) {
          const layer = result.layers[i];
          if (!layer.visible || !layer.loops) continue;
          for (const loop of layer.loops) {
            for (const pt of loop) {
              parts.push(`    <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r.toFixed(1)}" />`);
            }
          }
        }
        parts.push(`  </g>`);
      }
    }

    parts.push(`</svg>`);
    return parts.join('\n');
  }

  static rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  static hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Compute perceptual similarity score (0.0 to 100.0%) comparing original ImageData
   * against the vectorized layer reconstruction, accounting for path simplification & smoothing loss.
   */
  static computeLayerFidelity(imageData, labels, layers, simplifyTolerance = 1.0, smoothing = 0.5) {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 16000));

    // Map layer id -> RGB
    const layerMap = new Map();
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (l.visible !== false) {
        const rgb = l.r !== undefined ? l : this.hexToRgb(l.hex || '#000000');
        layerMap.set(l.id, rgb);
      }
    }

    let errSumSq = 0;
    let count = 0;

    for (let i = 0; i < totalPixels; i += step) {
      const idx = i * 4;
      if (data[idx + 3] < 40) continue;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lbl = labels[i];
      const cluster = layerMap.get(lbl);
      if (cluster) {
        errSumSq += this.colorDistSq(r, g, b, cluster.r, cluster.g, cluster.b);
      } else {
        // Hidden layer penalty
        errSumSq += 250000;
      }
      count++;
    }

    if (count === 0) return 100;
    const maxRedmeanSq = 9 * 255 * 255;
    const rmseNorm = Math.sqrt(errSumSq / count / maxRedmeanSq);

    // Small geometric penalty when path simplification or over-smoothing deviates from pixel contours
    const geoPenalty = Math.max(0, (simplifyTolerance - 0.3) * 0.0045) + Math.max(0, (smoothing - 0.45) * 0.003);
    const rawScore = (1 - rmseNorm - geoPenalty) * 100;
    return Number(Math.max(0, Math.min(99.9, rawScore)).toFixed(1));
  }

  /**
   * Auto-Match Optimizer: Analyzes the source image (color complexity, edge sharpness, noise, saturation)
   * and evaluates candidate vectorization settings to pick the parameters that match closest to the original image.
   */
  static findBestMatchOptions(sampleImageData) {
    const { data, width, height } = sampleImageData;
    const total = width * height;

    // 1. Analyze image statistics: saturation, high-frequency noise, edge density, distinct color buckets
    let satSum = 0;
    let noiseSum = 0;
    let edgeCount = 0;
    const colorBuckets = new Set();

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const i = y * width + x;
        const idx = i * 4;
        if (data[idx + 3] < 40) continue;

        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        satSum += maxC - minC;

        // Quantize to 5-bit per channel bucket to estimate color richness
        const bucket = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        colorBuckets.add(bucket);

        // Local horizontal & vertical neighbor differences
        const rRight = data[idx + 4], gRight = data[idx + 5], bRight = data[idx + 6];
        const rDown = data[idx + width * 4], gDown = data[idx + width * 4 + 1], bDown = data[idx + width * 4 + 2];
        const diffH = Math.abs(r - rRight) + Math.abs(g - gRight) + Math.abs(b - bRight);
        const diffV = Math.abs(r - rDown) + Math.abs(g - gDown) + Math.abs(b - bDown);

        if (diffH + diffV > 90) edgeCount++;
        if (diffH + diffV > 6 && diffH + diffV < 35) noiseSum++;
      }
    }

    const sampledPixels = Math.max(1, Math.floor(total / 4));
    const avgSat = satSum / sampledPixels;
    const noiseRatio = noiseSum / sampledPixels;
    const uniqueBucketCount = colorBuckets.size;

    // 2. Test candidate color counts (from 8 up to 32) on sampleImageData to find the optimal fidelity knee-point
    const candidateColors = uniqueBucketCount < 45
      ? [6, 10, 14, 18]
      : uniqueBucketCount < 160
        ? [12, 18, 24, 28]
        : [16, 24, 28, 32];

    // Determine optimal pre-blur: 0 for crisp vector-like / flat art, 1 for noisy / continuous gradients
    const bestBlur = noiseRatio > 0.22 ? 1 : 0;
    const preData = bestBlur > 0
      ? this.preprocessImageData(sampleImageData, { blurRadius: bestBlur })
      : sampleImageData;

    let bestK = candidateColors[candidateColors.length - 1];
    let bestScore = -1;

    for (const k of candidateColors) {
      const { labels, palette } = this.quantizeColors(preData, k);
      const score = this.computeLayerFidelity(sampleImageData, labels, palette, 0.4, 0.4);
      // Favor a lower K if adding more colors yields < 0.35% perceptual gain (prevents redundant splitting on flat art)
      if (score > bestScore + 0.35) {
        bestScore = score;
        bestK = k;
      }
    }

    // 3. Choose precision geometry parameters tailored to image structure
    const isCrispGraphic = uniqueBucketCount < 80 && noiseRatio < 0.12;
    const simplifyTolerance = isCrispGraphic ? 0.4 : 0.5;
    const smoothing = isCrispGraphic ? 0.35 : 0.45;
    const cornerThreshold = isCrispGraphic ? 45 : 55;
    const minArea = isCrispGraphic ? 4 : 6;
    const resolution = uniqueBucketCount > 140 ? 720 : 640;

    return {
      mode: 'color',
      numColors: bestK,
      layerStacking: 'stacked',
      strokeGapFix: 0.5,
      smoothing,
      simplifyTolerance,
      cornerThreshold,
      minArea,
      resolution,
      blurRadius: bestBlur,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      estimatedScore: bestScore,
      profileSummary: `${bestK} Colors • ${resolution}px Hi-Res • ${simplifyTolerance}px Precision`
    };
  }
}
