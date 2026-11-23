import React, { useState, memo } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ChevronDown,
  Maximize2,
  Scaling
} from 'lucide-react';

import type { SmartTransforms } from '../types';

interface TransformPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onFlip: (direction: 'horizontal' | 'vertical') => void;
  onRotate: (angle: number) => void;
  onScale: (sx: number, sy: number) => void;
  onResizeCanvas: (w: number, h: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  isActiveLayerSmartObject?: boolean;
  smartTransforms?: SmartTransforms;
  onUpdateSmartTransforms?: (t: SmartTransforms) => void;
}

const TransformPanel: React.FC<TransformPanelProps> = memo(
  ({
    isOpen,
    onToggle,
    onFlip,
    onRotate,
    onScale,
    onResizeCanvas,
    canvasWidth,
    canvasHeight,
    isActiveLayerSmartObject,
    smartTransforms,
    onUpdateSmartTransforms,
  }) => {
    // Scaling state
    const [scalePercent, setScalePercent] = useState<number>(100);
    
    // Canvas sizing state
    const [newWidth, setNewWidth] = useState<number>(canvasWidth);
    const [newHeight, setNewHeight] = useState<number>(canvasHeight);

    // Active Smart Object transform helper
    const t = smartTransforms || {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      filters: { brightness: 100, contrast: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 }
    };

    const handleApplyScale = () => {
      if (isActiveLayerSmartObject) {
        onUpdateSmartTransforms?.({
          ...t,
          scaleX: scalePercent / 100,
          scaleY: scalePercent / 100
        });
      } else {
        const factor = scalePercent / 100;
        onScale(factor, factor);
      }
    };

    const handleApplyResize = () => {
      if (newWidth > 0 && newHeight > 0) {
        onResizeCanvas(newWidth, newHeight);
      }
    };

    const handleSmartScaleChange = (val: number) => {
      onUpdateSmartTransforms?.({
        ...t,
        scaleX: val / 100,
        scaleY: val / 100
      });
    };

    const handleSmartRotationChange = (val: number) => {
      onUpdateSmartTransforms?.({
        ...t,
        rotation: val
      });
    };

    const handleSmartOffsetChange = (axis: 'x' | 'y', val: number) => {
      onUpdateSmartTransforms?.({
        ...t,
        offsetX: axis === 'x' ? val : t.offsetX,
        offsetY: axis === 'y' ? val : t.offsetY
      });
    };

    const handleSmartFlip = (direction: 'horizontal' | 'vertical') => {
      onUpdateSmartTransforms?.({
        ...t,
        scaleX: direction === 'horizontal' ? -t.scaleX : t.scaleX,
        scaleY: direction === 'vertical' ? -t.scaleY : t.scaleY
      });
    };

    const handleSmartRotate = (angle: number) => {
      onUpdateSmartTransforms?.({
        ...t,
        rotation: (t.rotation + angle) % 360
      });
    };

    return (
      <div className="panel-section">
        <div
          className={`panel-header${isOpen ? '' : ' collapsed'}`}
          onClick={onToggle}
        >
          <span>
            <Scaling size={11} style={{ display: 'inline', marginRight: 5 }} />
            Transform
          </span>
          <ChevronDown size={12} />
        </div>
        {isOpen && (
          <div className="panel-body">
            {isActiveLayerSmartObject ? (
              <>
                {/* Smart Object Mode */}
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--accent)',
                    background: 'var(--accent-dim)',
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px',
                    fontWeight: 5,
                    border: '1px solid rgba(74, 158, 255, 0.3)'
                  }}
                >
                  ✨ Smart Transform (Non-Destructive)
                </div>

                <div className="field-label" style={{ fontWeight: 'bold' }}>Quick Operations</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0', minWidth: '40px' }}
                    onClick={() => handleSmartFlip('horizontal')}
                    title="Flip Smart Object Horizontally"
                  >
                    <FlipHorizontal size={12} style={{ marginRight: '2px', display: 'inline' }} /> Flip H
                  </button>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0', minWidth: '40px' }}
                    onClick={() => handleSmartFlip('vertical')}
                    title="Flip Smart Object Vertically"
                  >
                    <FlipVertical size={12} style={{ marginRight: '2px', display: 'inline' }} /> Flip V
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0' }}
                    onClick={() => handleSmartRotate(90)}
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw size={11} style={{ marginRight: '2px', display: 'inline' }} /> 90° CW
                  </button>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0' }}
                    onClick={() => handleSmartRotate(-90)}
                    title="Rotate 90° Counter-Clockwise"
                  >
                    <RotateCcw size={11} style={{ marginRight: '2px', display: 'inline' }} /> 90° CCW
                  </button>
                </div>

                {/* Fine adjustments */}
                <div className="slider-row" style={{ marginTop: '10px' }}>
                  <div className="slider-label">
                    <span>Scale Factor</span>
                    <span className="slider-value">{Math.round(t.scaleX * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    value={Math.round(Math.abs(t.scaleX) * 100)}
                    onChange={(e) => handleSmartScaleChange(+e.target.value)}
                  />
                </div>

                <div className="slider-row" style={{ marginTop: '8px' }}>
                  <div className="slider-label">
                    <span>Rotation</span>
                    <span className="slider-value">{t.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={t.rotation}
                    onChange={(e) => handleSmartRotationChange(+e.target.value)}
                  />
                </div>

                <div className="slider-row" style={{ marginTop: '8px' }}>
                  <div className="slider-label">
                    <span>Offset X</span>
                    <span className="slider-value">{t.offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.round(canvasWidth / 2)}
                    max={Math.round(canvasWidth / 2)}
                    value={t.offsetX}
                    onChange={(e) => handleSmartOffsetChange('x', +e.target.value)}
                  />
                </div>

                <div className="slider-row" style={{ marginTop: '8px' }}>
                  <div className="slider-label">
                    <span>Offset Y</span>
                    <span className="slider-value">{t.offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.round(canvasHeight / 2)}
                    max={Math.round(canvasHeight / 2)}
                    value={t.offsetY}
                    onChange={(e) => handleSmartOffsetChange('y', +e.target.value)}
                  />
                </div>

                <button
                  className="panel-action-btn"
                  style={{ marginTop: '8px', width: '100%' }}
                  onClick={() => onUpdateSmartTransforms?.({
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    offsetX: 0,
                    offsetY: 0,
                    filters: t.filters
                  })}
                >
                  Reset Transforms
                </button>
              </>
            ) : (
              <>
                {/* Raster Mode */}
                <div className="field-label" style={{ fontWeight: 'bold', marginTop: '4px' }}>Layer Transforms</div>
                
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0', minWidth: '40px' }}
                    onClick={() => onFlip('horizontal')}
                    title="Flip Horizontally"
                  >
                    <FlipHorizontal size={12} style={{ marginRight: '2px', display: 'inline' }} /> Flip H
                  </button>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0', minWidth: '40px' }}
                    onClick={() => onFlip('vertical')}
                    title="Flip Vertically"
                  >
                    <FlipVertical size={12} style={{ marginRight: '2px', display: 'inline' }} /> Flip V
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0' }}
                    onClick={() => onRotate(90)}
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw size={11} style={{ marginRight: '2px', display: 'inline' }} /> 90° CW
                  </button>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0' }}
                    onClick={() => onRotate(-90)}
                    title="Rotate 90° Counter-Clockwise"
                  >
                    <RotateCcw size={11} style={{ marginRight: '2px', display: 'inline' }} /> 90° CCW
                  </button>
                  <button
                    className="panel-action-btn"
                    style={{ flex: 1, padding: '6px 0' }}
                    onClick={() => onRotate(180)}
                    title="Rotate 180°"
                  >
                    180°
                  </button>
                </div>

                <div className="slider-row" style={{ marginTop: '8px' }}>
                  <div className="slider-label">
                    <span>Scale Layer</span>
                    <span className="slider-value">{scalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    value={scalePercent}
                    onChange={(e) => setScalePercent(+e.target.value)}
                  />
                  <button
                    className="panel-action-btn accent"
                    onClick={handleApplyScale}
                    style={{ marginTop: '4px' }}
                  >
                    Apply Scale
                  </button>
                </div>
              </>
            )}

            <div className="tool-sep" style={{ margin: '8px 0', width: '100%' }} />

            {/* 3. Resize Document Canvas */}
            <div className="field-label" style={{ fontWeight: 'bold' }}>Document Canvas Sizing</div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div className="field-label" style={{ fontSize: '9px', marginBottom: '2px' }}>Width (px)</div>
                <input
                  type="number"
                  value={newWidth}
                  onChange={(e) => setNewWidth(+e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '4px 6px',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-label" style={{ fontSize: '9px', marginBottom: '2px' }}>Height (px)</div>
                <input
                  type="number"
                  value={newHeight}
                  onChange={(e) => setNewHeight(+e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '4px 6px',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              className="panel-action-btn"
              onClick={handleApplyResize}
              style={{ marginTop: '8px' }}
            >
              <Maximize2 size={11} style={{ marginRight: '4px', display: 'inline' }} /> Resize Document
            </button>

          </div>
        )}
      </div>
    );
  }
);

TransformPanel.displayName = 'TransformPanel';
export default TransformPanel;
