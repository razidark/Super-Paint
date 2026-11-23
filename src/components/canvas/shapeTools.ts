import type { Tool } from '../../types';

interface ShapeStyle {
  strokeColor: string;
  fillColor: string;
  lineWidth: number;
  opacity: number;
}

/**
 * Render a shape (line, rectangle, or circle) onto a canvas context.
 * Used for both the overlay preview and the final commit to a layer.
 */
export function renderShape(
  ctx: CanvasRenderingContext2D,
  tool: Tool,
  start: { x: number; y: number },
  end: { x: number; y: number },
  style: ShapeStyle
): void {
  ctx.globalAlpha = style.opacity;
  ctx.strokeStyle = style.strokeColor;
  ctx.fillStyle = style.fillColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = end.x - start.x;
  const h = end.y - start.y;

  if (tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === 'rectangle') {
    ctx.beginPath();
    ctx.rect(start.x, start.y, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (tool === 'circle') {
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    const cx = start.x + w / 2;
    const cy = start.y + h / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (tool === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(start.x + w / 2, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(start.x, end.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tool === 'star') {
    const cx = start.x + w / 2;
    const cy = start.y + h / 2;
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    const outerRadius = Math.min(rx, ry);
    const innerRadius = outerRadius * 0.4;
    const spikes = 5;
    let rot = (Math.PI / 2) * 3;
    let sx: number;
    let sy: number;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      sx = cx + Math.cos(rot) * outerRadius;
      sy = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(sx, sy);
      rot += step;

      sx = cx + Math.cos(rot) * innerRadius;
      sy = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(sx, sy);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
