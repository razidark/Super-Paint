import type { Tool } from '../../types';

interface BrushParams {
  brushColor: string;
  brushSize: number;
  opacity: number;
  hardness: number;
  tool: Tool;
}

/**
 * Paint a single brush/pencil/eraser dab at (x, y) with the given pressure.
 * When isFirst is false, also draws a connecting stroke from lastPos.
 */
export function paintBrushStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pressure: number,
  isFirst: boolean,
  lastPos: { x: number; y: number },
  params: BrushParams
): void {
  const { brushColor, brushSize, opacity, hardness, tool } = params;
  const size = brushSize * pressure;
  const alpha = opacity * pressure;

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  if (tool === 'spray') {
    ctx.fillStyle = brushColor;
    ctx.globalAlpha = alpha * 0.4;
    ctx.globalCompositeOperation = 'source-over';
    
    const particleCount = Math.round(size * 1.5);
    const radius = size / 2;
    ctx.beginPath();
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      ctx.rect(px, py, Math.random() > 0.5 ? 1.5 : 1, Math.random() > 0.5 ? 1.5 : 1);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  // Radial gradient for soft brush vs hard pencil
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
  const hardEdge = hardness / 100;
  gradient.addColorStop(0, brushColor);
  gradient.addColorStop(hardEdge, brushColor);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.globalAlpha = tool === 'pencil' ? alpha * 0.7 : alpha;
  ctx.globalCompositeOperation = 'source-over';

  if (tool === 'pencil') {
    // Pencil: sharp with texture jitter
    ctx.fillStyle = brushColor;
    const jitter = (1 - hardness / 100) * 2;
    const rx = x + (Math.random() - 0.5) * jitter;
    const ry = y + (Math.random() - 0.5) * jitter;
    ctx.beginPath();
    ctx.arc(rx, ry, (size / 2) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Brush: soft airbrush style
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!isFirst) {
    // Connect strokes with line for smoothness
    ctx.globalAlpha = tool === 'pencil' ? alpha * 0.5 : alpha * 0.6;
    ctx.strokeStyle =
      tool === 'pencil' ? brushColor : (gradient as unknown as string);
    ctx.lineWidth = tool === 'pencil' ? (size / 2) * 0.8 : size * 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
