import React, { useRef, useEffect, useState, memo } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

interface ColorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  brushColor: string;
  fillColor: string;
  onBrushColorChange: (c: string) => void;
  onFillColorChange: (c: string) => void;
}

const ColorPanel: React.FC<ColorPanelProps> = memo(
  ({
    isOpen,
    onToggle,
    brushColor,
    fillColor,
    onBrushColorChange,
    onFillColorChange,
  }) => {
    // Current picking target: 'fg' (foreground) or 'bg' (background)
    const [target, setTarget] = useState<'fg' | 'bg'>('fg');

    // Active color representation in HSV
    const activeColor = target === 'fg' ? brushColor : fillColor;
    const { h, s, v } = hexToHsv(activeColor);

    // Canvas references
    const svCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hueCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Drag states
    const isDraggingSv = useRef(false);
    const isDraggingHue = useRef(false);

    // 1. Redraw Saturation-Value Box
    useEffect(() => {
      if (!isOpen) return;
      const canvas = svCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const canvasHeight = canvas.height;

      // Draw base color (pure hue) gradient
      ctx.fillStyle = hsvToHex(h, 1, 1);
      ctx.fillRect(0, 0, w, canvasHeight);

      // White overlay (left to right)
      const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
      whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(0, 0, w, canvasHeight);

      // Black overlay (top to bottom)
      const blackGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = blackGrad;
      ctx.fillRect(0, 0, w, canvasHeight);

      // Draw selector circle
      const cx = s * w;
      const cy = (1 - v) * canvasHeight;
      ctx.strokeStyle = v > 0.6 && s < 0.4 ? '#000000' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.stroke();
    }, [h, s, v, isOpen]);

    // 2. Redraw Hue Slider
    useEffect(() => {
      if (!isOpen) return;
      const canvas = hueCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const canvasHeight = canvas.height;

      ctx.clearRect(0, 0, w, canvasHeight);

      // Vertical rainbow spectrum
      const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      grad.addColorStop(0, '#ff0000');
      grad.addColorStop(0.17, '#ff00ff');
      grad.addColorStop(0.33, '#0000ff');
      grad.addColorStop(0.5, '#00ffff');
      grad.addColorStop(0.67, '#00ff00');
      grad.addColorStop(0.83, '#ffff00');
      grad.addColorStop(1, '#ff0000');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, canvasHeight);

      // Draw active indicator pointer line
      const targetY = (h / 360) * canvasHeight;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, targetY);
      ctx.lineTo(w, targetY);
      ctx.stroke();
    }, [h, isOpen]);

    // SV Box click/drag handler
    const handleSvMove = (clientX: number, clientY: number) => {
      const canvas = svCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let x = (clientX - rect.left) / rect.width;
      let y = (clientY - rect.top) / rect.height;

      // Clamp values
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));

      const newHex = hsvToHex(h, x, 1 - y);
      if (target === 'fg') {
        onBrushColorChange(newHex);
      } else {
        onFillColorChange(newHex);
      }
    };

    // Hue drag handler
    const handleHueMove = (clientY: number) => {
      const canvas = hueCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let y = (clientY - rect.top) / rect.height;
      y = Math.max(0, Math.min(1, y));

      const newHue = y * 360;
      const newHex = hsvToHex(newHue, s, v);
      if (target === 'fg') {
        onBrushColorChange(newHex);
      } else {
        onFillColorChange(newHex);
      }
    };

    // Swap Foreground / Background colors
    const handleSwapColors = () => {
      const temp = brushColor;
      onBrushColorChange(fillColor);
      onFillColorChange(temp);
    };

    // Reset default colors: FG = Black, BG = White
    const handleResetDefault = () => {
      onBrushColorChange('#000000');
      onFillColorChange('#ffffff');
    };

    return (
      <div className="panel-section">
        <div
          className={`panel-header${isOpen ? '' : ' collapsed'}`}
          onClick={onToggle}
        >
          <span>
            <RefreshCw size={11} style={{ display: 'inline', marginRight: 5 }} />
            Cor (Color)
          </span>
          <ChevronDown size={12} />
        </div>
        {isOpen && (
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* Overlapping FG/BG indicator (mimics Photoshop toolbar picker) */}
              <div style={{ position: 'relative', width: '56px', height: '56px', marginRight: '6px' }}>
                {/* BG Box */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    width: '32px',
                    height: '32px',
                    background: fillColor,
                    border: target === 'bg' ? '2px solid var(--accent)' : '1.5px solid #000000',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    zIndex: target === 'bg' ? 5 : 1
                  }}
                  onClick={() => setTarget('bg')}
                  title="Background Color (Click to select)"
                />
                
                {/* FG Box */}
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    width: '32px',
                    height: '32px',
                    background: brushColor,
                    border: target === 'fg' ? '2px solid var(--accent)' : '1.5px solid #000000',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    zIndex: target === 'fg' ? 5 : 1
                  }}
                  onClick={() => setTarget('fg')}
                  title="Foreground Brush Color (Click to select)"
                />

                {/* Swapper arrow */}
                <button
                  onClick={handleSwapColors}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '9px'
                  }}
                  title="Swap Colors"
                >
                  ⇄
                </button>

                {/* Reset default button */}
                <button
                  onClick={handleResetDefault}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '9px',
                    fontWeight: 'bold'
                  }}
                  title="Reset to Black/White"
                >
                  ⛃
                </button>
              </div>

              {/* Saturation-Value Canvas Box */}
              <canvas
                ref={svCanvasRef}
                width={130}
                height={130}
                style={{
                  border: '1px solid #111111',
                  cursor: 'crosshair',
                  display: 'block'
                }}
                onMouseDown={(e) => {
                  isDraggingSv.current = true;
                  handleSvMove(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (isDraggingSv.current) handleSvMove(e.clientX, e.clientY);
                }}
                onMouseUp={() => (isDraggingSv.current = false)}
                onMouseLeave={() => (isDraggingSv.current = false)}
              />

              {/* Hue Canvas Slider */}
              <canvas
                ref={hueCanvasRef}
                width={18}
                height={130}
                style={{
                  border: '1px solid #111111',
                  cursor: 'ns-resize',
                  display: 'block'
                }}
                onMouseDown={(e) => {
                  isDraggingHue.current = true;
                  handleHueMove(e.clientY);
                }}
                onMouseMove={(e) => {
                  if (isDraggingHue.current) handleHueMove(e.clientY);
                }}
                onMouseUp={() => (isDraggingHue.current = false)}
                onMouseLeave={() => (isDraggingHue.current = false)}
              />
            </div>

            {/* Direct Hex Code Input for accessibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Hex:</span>
              <input
                type="text"
                value={activeColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-F]{6}$/i.test(val)) {
                    if (target === 'fg') onBrushColorChange(val);
                    else onFillColorChange(val);
                  }
                }}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>
                {target === 'fg' ? 'PINCEL' : 'BALDE'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// ---- HSV & Hex Conversion Helpers ----

function hsvToHex(h: number, s: number, v: number): string {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

ColorPanel.displayName = 'ColorPanel';
export default ColorPanel;
