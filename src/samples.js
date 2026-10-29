/**
 * Built-in rich procedural raster sample images for instant testing of Raster2Vector
 */

export const SAMPLE_PRESETS = [
  {
    id: 'toucan',
    name: 'Tropical Toucan',
    subtitle: 'Vibrant gradients & foliage',
    render(ctx, w, h) {
      // Lush jungle gradient sky
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0f4c5c');
      bg.addColorStop(0.5, '#1b7a78');
      bg.addColorStop(1, '#2b9348');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Soft bokeh sun / moon in background
      const sunGrad = ctx.createRadialGradient(w * 0.72, h * 0.25, 10, w * 0.72, h * 0.25, w * 0.22);
      sunGrad.addColorStop(0, '#fff3b0');
      sunGrad.addColorStop(0.7, '#ffca3a');
      sunGrad.addColorStop(1, 'rgba(255,202,58,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.25, w * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Background tropical leaves
      const drawLeaf = (cx, cy, angle, scale, color1, color2) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        const g = ctx.createLinearGradient(-80, -40, 80, 40);
        g.addColorStop(0, color1);
        g.addColorStop(1, color2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(60, -70, 160, -60, 220, 0);
        ctx.bezierCurveTo(160, 60, 60, 70, 0, 0);
        ctx.fill();
        ctx.restore();
      };

      drawLeaf(w * 0.05, h * 0.22, 0.3, 1.3, '#55a630', '#2b9348');
      drawLeaf(w * 0.02, h * 0.75, -0.4, 1.5, '#80b918', '#007f5f');
      drawLeaf(w * 0.85, h * 0.82, -2.5, 1.4, '#55a630', '#1b4332');

      // Tree branch
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.78);
      ctx.quadraticCurveTo(w * 0.45, h * 0.68, w * 0.92, h * 0.75);
      ctx.stroke();

      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.07, h * 0.765);
      ctx.quadraticCurveTo(w * 0.45, h * 0.665, w * 0.9, h * 0.735);
      ctx.stroke();

      // Toucan Tail
      ctx.fillStyle = '#111625';
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.67);
      ctx.lineTo(w * 0.14, h * 0.88);
      ctx.lineTo(w * 0.23, h * 0.91);
      ctx.lineTo(w * 0.35, h * 0.71);
      ctx.closePath();
      ctx.fill();

      // Red undertail coverts
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(w * 0.31, h * 0.69, 26, 0, Math.PI * 2);
      ctx.fill();

      // Toucan Body (Black plumage with subtle blue sheen gradient)
      const bodyGrad = ctx.createLinearGradient(w * 0.25, h * 0.25, w * 0.52, h * 0.72);
      bodyGrad.addColorStop(0, '#1d2436');
      bodyGrad.addColorStop(0.5, '#121622');
      bodyGrad.addColorStop(1, '#090b10');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.38, h * 0.51, 88, 135, 0.24, 0, Math.PI * 2);
      ctx.fill();

      // Wing highlight
      const wingGrad = ctx.createLinearGradient(w * 0.28, h * 0.42, w * 0.42, h * 0.65);
      wingGrad.addColorStop(0, '#2b3954');
      wingGrad.addColorStop(1, '#141b29');
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.34, h * 0.54, 48, 86, 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Golden yellow throat/chest
      const throatGrad = ctx.createRadialGradient(w * 0.44, h * 0.38, 10, w * 0.43, h * 0.41, 78);
      throatGrad.addColorStop(0, '#ffea00');
      throatGrad.addColorStop(0.7, '#ffaa00');
      throatGrad.addColorStop(1, '#ff7b00');
      ctx.fillStyle = throatGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.43, h * 0.41, 56, 72, 0.15, -Math.PI * 0.55, Math.PI * 0.65);
      ctx.closePath();
      ctx.fill();

      // Crimson chest band
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(w * 0.41, h * 0.43, 62, 0.15, 1.35);
      ctx.stroke();

      // Eye ring (Bright Cyan Blue)
      ctx.fillStyle = '#00bbf9';
      ctx.beginPath();
      ctx.arc(w * 0.42, h * 0.31, 21, 0, Math.PI * 2);
      ctx.fill();

      // Inner dark eye
      ctx.fillStyle = '#0b090a';
      ctx.beginPath();
      ctx.arc(w * 0.42, h * 0.31, 12, 0, Math.PI * 2);
      ctx.fill();

      // Eye specular catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w * 0.428, h * 0.298, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Giant Colorful Beak
      const beakGrad = ctx.createLinearGradient(w * 0.47, h * 0.25, w * 0.82, h * 0.38);
      beakGrad.addColorStop(0, '#ffbe0b');
      beakGrad.addColorStop(0.45, '#fb5607');
      beakGrad.addColorStop(0.85, '#e63946');
      beakGrad.addColorStop(1, '#111625');

      ctx.fillStyle = beakGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.47, h * 0.24);
      ctx.quadraticCurveTo(w * 0.71, h * 0.21, w * 0.81, h * 0.37);
      ctx.quadraticCurveTo(w * 0.65, h * 0.41, w * 0.47, h * 0.39);
      ctx.closePath();
      ctx.fill();

      // Beak Black Tip
      ctx.fillStyle = '#111625';
      ctx.beginPath();
      ctx.moveTo(w * 0.74, h * 0.285);
      ctx.quadraticCurveTo(w * 0.79, h * 0.32, w * 0.81, h * 0.37);
      ctx.quadraticCurveTo(w * 0.76, h * 0.385, w * 0.72, h * 0.38);
      ctx.closePath();
      ctx.fill();

      // Claws on branch
      ctx.fillStyle = '#3a506b';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.39 + i * 14, h * 0.705, 6, 12, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'sunset_peaks',
    name: 'Alpine Sunset',
    subtitle: 'Layered mountains & lake reflection',
    render(ctx, w, h) {
      // Sunset sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
      sky.addColorStop(0, '#1a1446');
      sky.addColorStop(0.28, '#5a189a');
      sky.addColorStop(0.55, '#e01e5a');
      sky.addColorStop(0.8, '#ff6d00');
      sky.addColorStop(1, '#ffbe0b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.68);

      // Glowing Sun
      const sun = ctx.createRadialGradient(w * 0.5, h * 0.36, 10, w * 0.5, h * 0.36, w * 0.19);
      sun.addColorStop(0, '#ffffff');
      sun.addColorStop(0.4, '#ffea79');
      sun.addColorStop(0.8, '#ff9e00');
      sun.addColorStop(1, 'rgba(255, 158, 0, 0)');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.36, w * 0.19, 0, Math.PI * 2);
      ctx.fill();

      // Distant mountain range 1
      ctx.fillStyle = '#7b2cbf';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(0, h * 0.46);
      ctx.lineTo(w * 0.18, h * 0.32);
      ctx.lineTo(w * 0.34, h * 0.48);
      ctx.lineTo(w * 0.52, h * 0.28);
      ctx.lineTo(w * 0.71, h * 0.45);
      ctx.lineTo(w * 0.86, h * 0.31);
      ctx.lineTo(w, h * 0.44);
      ctx.lineTo(w, h * 0.68);
      ctx.closePath();
      ctx.fill();

      // Snow/Sunlit facet on main peak
      ctx.fillStyle = '#ff9e00';
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.28);
      ctx.lineTo(w * 0.45, h * 0.39);
      ctx.lineTo(w * 0.51, h * 0.41);
      ctx.lineTo(w * 0.55, h * 0.35);
      ctx.closePath();
      ctx.fill();

      // Midground mountain range 2
      ctx.fillStyle = '#3c096c';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(0, h * 0.54);
      ctx.lineTo(w * 0.12, h * 0.44);
      ctx.lineTo(w * 0.29, h * 0.55);
      ctx.lineTo(w * 0.44, h * 0.42);
      ctx.lineTo(w * 0.63, h * 0.56);
      ctx.lineTo(w * 0.78, h * 0.41);
      ctx.lineTo(w, h * 0.53);
      ctx.lineTo(w, h * 0.68);
      ctx.closePath();
      ctx.fill();

      // Foreground pine ridge
      ctx.fillStyle = '#10002b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(0, h * 0.58);
      ctx.lineTo(w * 0.24, h * 0.63);
      ctx.lineTo(w * 0.65, h * 0.59);
      ctx.lineTo(w, h * 0.56);
      ctx.lineTo(w, h * 0.68);
      ctx.closePath();
      ctx.fill();

      // Lake water below
      const lake = ctx.createLinearGradient(0, h * 0.68, 0, h);
      lake.addColorStop(0, '#ff7b00');
      lake.addColorStop(0.35, '#9d4edd');
      lake.addColorStop(0.75, '#240046');
      lake.addColorStop(1, '#10002b');
      ctx.fillStyle = lake;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);

      // Sun ripples on water
      ctx.fillStyle = '#ffea79';
      for (let i = 0; i < 9; i++) {
        const ry = h * 0.71 + i * (h * 0.03);
        const rw = (w * 0.22) * (1 - i * 0.08);
        ctx.beginPath();
        ctx.roundRect(w * 0.5 - rw / 2, ry, rw, 6, 3);
        ctx.fill();
      }
    }
  },
  {
    id: 'geometric_fox',
    name: 'Emblem Fox',
    subtitle: 'Bold mascot badge for logos & stencils',
    render(ctx, w, h) {
      // Soft cream background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, w, h);

      // Dark navy circular badge
      ctx.fillStyle = '#1d3557';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, w * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Inner teal ring
      ctx.strokeStyle = '#457b9d';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, w * 0.33, 0, Math.PI * 2);
      ctx.stroke();

      // Left & Right Ears (Outer Dark Orange)
      ctx.fillStyle = '#e76f51';
      ctx.beginPath();
      ctx.moveTo(w * 0.24, h * 0.42);
      ctx.lineTo(w * 0.28, h * 0.14);
      ctx.lineTo(w * 0.44, h * 0.32);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.76, h * 0.42);
      ctx.lineTo(w * 0.72, h * 0.14);
      ctx.lineTo(w * 0.56, h * 0.32);
      ctx.closePath();
      ctx.fill();

      // Inner Ears (Dark Charcoal)
      ctx.fillStyle = '#264653';
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.38);
      ctx.lineTo(w * 0.30, h * 0.20);
      ctx.lineTo(w * 0.40, h * 0.33);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.38);
      ctx.lineTo(w * 0.70, h * 0.20);
      ctx.lineTo(w * 0.60, h * 0.33);
      ctx.closePath();
      ctx.fill();

      // Fox Head Main Shape (Vibrant Orange-Gold gradient)
      const headGrad = ctx.createLinearGradient(w * 0.2, h * 0.3, w * 0.8, h * 0.82);
      headGrad.addColorStop(0, '#f4a261');
      headGrad.addColorStop(0.5, '#e76f51');
      headGrad.addColorStop(1, '#d62828');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.28);
      ctx.lineTo(w * 0.76, h * 0.42);
      ctx.lineTo(w * 0.80, h * 0.58);
      ctx.lineTo(w * 0.5, h * 0.84);
      ctx.lineTo(w * 0.20, h * 0.58);
      ctx.lineTo(w * 0.24, h * 0.42);
      ctx.closePath();
      ctx.fill();

      // White Cheek Fur (Left & Right)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(w * 0.20, h * 0.58);
      ctx.lineTo(w * 0.38, h * 0.56);
      ctx.lineTo(w * 0.5, h * 0.84);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.80, h * 0.58);
      ctx.lineTo(w * 0.62, h * 0.56);
      ctx.lineTo(w * 0.5, h * 0.84);
      ctx.closePath();
      ctx.fill();

      // Center Nose Bridge Highlight
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.28);
      ctx.lineTo(w * 0.58, h * 0.56);
      ctx.lineTo(w * 0.5, h * 0.80);
      ctx.lineTo(w * 0.42, h * 0.56);
      ctx.closePath();
      ctx.fill();

      // Fierce Geometric Eyes
      ctx.fillStyle = '#1d3557';
      ctx.beginPath();
      ctx.moveTo(w * 0.31, h * 0.48);
      ctx.lineTo(w * 0.42, h * 0.52);
      ctx.lineTo(w * 0.34, h * 0.54);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.69, h * 0.48);
      ctx.lineTo(w * 0.58, h * 0.52);
      ctx.lineTo(w * 0.66, h * 0.54);
      ctx.closePath();
      ctx.fill();

      // Black Nose Tip
      ctx.fillStyle = '#111625';
      ctx.beginPath();
      ctx.moveTo(w * 0.45, h * 0.77);
      ctx.lineTo(w * 0.55, h * 0.77);
      ctx.lineTo(w * 0.5, h * 0.85);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: 'botanical_ink',
    name: 'Botanical Sketch',
    subtitle: 'Ideal for B&W Stencil & Line Art',
    render(ctx, w, h) {
      // Warm vintage parchment paper
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, '#fdfbf7');
      bg.addColorStop(1, '#e9e2d0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Decorative double frame
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 6;
      ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

      // Draw botanical fern / ginkgo branches in deep ink
      ctx.save();
      ctx.translate(w * 0.5, h * 0.85);
      ctx.strokeStyle = '#1a1c20';
      ctx.fillStyle = '#1a1c20';

      // Main curving stem
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-20, -h * 0.25, 25, -h * 0.48, 0, -h * 0.68);
      ctx.stroke();

      // Paired leaves along the stem
      const pairs = 6;
      for (let i = 0; i < pairs; i++) {
        const t = (i + 1) / (pairs + 0.5);
        const y = -t * h * 0.64;
        const xOffset = Math.sin(t * Math.PI * 1.5) * 10;
        const size = (1 - t * 0.45) * 75;

        for (const dir of [-1, 1]) {
          ctx.save();
          ctx.translate(xOffset, y);
          ctx.rotate(dir * (0.55 + i * 0.04));

          // Leaf silhouette with serrated/cutout holes
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(dir * size * 0.4, -size * 0.45, dir * size * 0.9, -size * 0.35, dir * size * 1.15, 0);
          ctx.bezierCurveTo(dir * size * 0.9, size * 0.35, dir * size * 0.4, size * 0.45, 0, 0);
          ctx.fill();

          // Inner cutout veins in parchment color
          ctx.strokeStyle = '#f6f2e8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(dir * size * 0.12, 0);
          ctx.lineTo(dir * size * 0.95, 0);
          ctx.stroke();

          ctx.restore();
        }
      }

      // Top Sun / Moon medallion
      ctx.beginPath();
      ctx.arc(0, -h * 0.69, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdfbf7';
      ctx.beginPath();
      ctx.arc(8, -h * 0.69 - 4, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
];
