import React, { memo } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import type { Tool } from '../types';

interface BrushPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  brushColor: string;
  fillColor: string;
  brushSize: number;
  opacity: number;
  hardness: number;
  tool: Tool;
  textFont: string;
  textSize: number;
  onBrushColorChange: (c: string) => void;
  onFillColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onOpacityChange: (o: number) => void;
  onHardnessChange: (h: number) => void;
  onTextFontChange: (f: string) => void;
  onTextSizeChange: (s: number) => void;
}

const BrushPanel: React.FC<BrushPanelProps> = memo(
  ({
    isOpen,
    onToggle,
    brushColor,
    fillColor,
    brushSize,
    opacity,
    hardness,
    tool,
    textFont,
    textSize,
    onBrushColorChange,
    onFillColorChange,
    onBrushSizeChange,
    onOpacityChange,
    onHardnessChange,
    onTextFontChange,
    onTextSizeChange,
  }) => (
    <div className="panel-section">
      <div
        className={`panel-header${isOpen ? '' : ' collapsed'}`}
        onClick={onToggle}
      >
        <span>
          <Palette size={11} style={{ display: 'inline', marginRight: 5 }} />
          Brush
        </span>
        <ChevronDown size={12} />
      </div>
      {isOpen && (
        <div className="panel-body">
          {/* Foreground / background color swatches */}
          <div className="color-swatches">
            <div className="color-swatch-bg" style={{ background: fillColor }}>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => onFillColorChange(e.target.value)}
              />
            </div>
            <div className="color-swatch-fg" style={{ background: brushColor }}>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onBrushColorChange(e.target.value)}
              />
            </div>
          </div>

          <div className="slider-row">
            <div className="slider-label">
              <span>Size</span>
              <span className="slider-value">{brushSize}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(+e.target.value)}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label">
              <span>Opacity</span>
              <span className="slider-value">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => onOpacityChange(+e.target.value / 100)}
            />
          </div>

          <div className="slider-row">
            <div className="slider-label">
              <span>Hardness</span>
              <span className="slider-value">{hardness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={hardness}
              onChange={(e) => onHardnessChange(+e.target.value)}
            />
          </div>

          {tool === 'text' && (
            <>
              <div className="field-label">Font</div>
              <select
                value={textFont}
                onChange={(e) => onTextFontChange(e.target.value)}
              >
                <option>Inter</option>
                <option>Arial</option>
                <option>Georgia</option>
                <option>Courier New</option>
                <option>Impact</option>
                <option>Comic Sans MS</option>
              </select>
              <div className="slider-row">
                <div className="slider-label">
                  <span>Text Size</span>
                  <span className="slider-value">{textSize}px</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={200}
                  value={textSize}
                  onChange={(e) => onTextSizeChange(+e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
);

BrushPanel.displayName = 'BrushPanel';
export default BrushPanel;
