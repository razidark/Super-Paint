import React, { memo } from 'react';
import { Layers, ChevronDown, Plus, X, Eye, EyeOff } from 'lucide-react';
import type { LayerMetadata, BlendMode } from '../types';

interface LayersPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  layers: LayerMetadata[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onSetBlendMode: (id: string, blendMode: BlendMode) => void;
  onConvertToSmartObject?: (id: string) => void;
  onEditSmartObject?: (id: string) => void;
  onRasterizeLayer?: (id: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = memo(
  ({
    isOpen,
    onToggle,
    layers,
    activeLayerId,
    onSelectLayer,
    onAddLayer,
    onDeleteLayer,
    onToggleVisibility,
    onSetOpacity,
    onSetBlendMode,
    onConvertToSmartObject,
    onEditSmartObject,
    onRasterizeLayer,
  }) => (
    <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        className={`panel-header${isOpen ? '' : ' collapsed'}`}
        onClick={onToggle}
      >
        <span>
          <Layers size={11} style={{ display: 'inline', marginRight: 5 }} />
          Layers
        </span>
        <ChevronDown size={12} />
      </div>
      {isOpen && (
        <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '8px' }}>
          <div className="layers-actions">
            <button onClick={onAddLayer}>
              <Plus size={12} /> Add
            </button>
            <button
              onClick={() => onDeleteLayer(activeLayerId)}
              disabled={layers.length <= 1}
            >
              <X size={12} /> Delete
            </button>
          </div>

          <div className="layers-list" style={{ flex: 1, overflowY: 'auto', gap: '4px', paddingRight: '2px' }}>
            {[...layers].reverse().map((layer) => (
              <div key={layer.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px', paddingTop: '2px' }}>
                <div
                  className={`layer-item${layer.id === activeLayerId ? ' active' : ''}`}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <button
                    className={`layer-vis-btn${!layer.visible ? ' hidden' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <div className="layer-thumb" style={{ position: 'relative' }}>
                    {layer.isSmartObject && (
                      <div style={{
                        position: 'absolute',
                        bottom: '1px',
                        right: '1px',
                        width: '6px',
                        height: '6px',
                        background: 'var(--accent)',
                        borderRadius: '1px'
                      }} title="Smart Object Asset Source" />
                    )}
                  </div>
                  <span className="layer-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {layer.isSmartObject && (
                      <span style={{
                        color: 'var(--accent)',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        border: '1px solid var(--accent)',
                        borderRadius: '2px',
                        padding: '0px 2px',
                        lineHeight: 1
                      }}>SMART</span>
                    )}
                    {layer.name}
                  </span>
                  <button
                    className="layer-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    disabled={layers.length <= 1}
                  >
                    <X size={12} />
                  </button>
                </div>
                {layer.id === activeLayerId && (
                  <div style={{ padding: '2px 8px 4px' }}>
                    <div className="slider-row">
                      <div className="slider-label">
                        <span>Opacity</span>
                        <span className="slider-value">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(layer.opacity * 100)}
                        onChange={(e) =>
                          onSetOpacity(layer.id, +e.target.value / 100)
                        }
                      />
                    </div>
                    <div className="slider-row" style={{ marginTop: '6px' }}>
                      <div className="slider-label">
                        <span>Blend Mode</span>
                      </div>
                      <select
                        value={layer.blendMode || 'normal'}
                        onChange={(e) => onSetBlendMode(layer.id, e.target.value as BlendMode)}
                        style={{ fontSize: '10px', padding: '3px 6px', height: '22px' }}
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="darken">Darken</option>
                        <option value="lighten">Lighten</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="difference">Difference</option>
                        <option value="exclusion">Exclusion</option>
                        <option value="hue">Hue</option>
                        <option value="saturation">Saturation</option>
                        <option value="color">Color</option>
                        <option value="luminosity">Luminosity</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {layer.isSmartObject ? (
                        <>
                          <button
                            className="panel-action-btn accent"
                            style={{ flex: 1, padding: '4px 0', fontSize: '10px' }}
                            onClick={() => onEditSmartObject?.(layer.id)}
                            title="Edit original Smart Object drawings/contents"
                          >
                            Edit Contents
                          </button>
                          <button
                            className="panel-action-btn"
                            style={{ flex: 1, padding: '4px 0', fontSize: '10px' }}
                            onClick={() => onRasterizeLayer?.(layer.id)}
                            title="Rasterize Smart Object back into regular pixel drawing"
                          >
                            Rasterize
                          </button>
                        </>
                      ) : (
                        <button
                          className="panel-action-btn"
                          style={{ width: '100%', padding: '4px 0', fontSize: '10px' }}
                          onClick={() => onConvertToSmartObject?.(layer.id)}
                          title="Convert raster layer to a Photoshop-style Smart Object"
                        >
                          Convert to Smart Object
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
);

LayersPanel.displayName = 'LayersPanel';
export default LayersPanel;

