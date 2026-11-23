import React, { useState, memo } from 'react';
import { Sliders, Check } from 'lucide-react';
import type { LayerMetadata } from '../types';

interface PropertiesPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  canvasWidth: number;
  canvasHeight: number;
  activeLayer: LayerMetadata | undefined;
  onRenameLayer: (id: string, newName: string) => void;
  onClearActiveLayer: () => void;
  onDuplicateActiveLayer: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = memo(
  ({
    isOpen,
    onToggle,
    canvasWidth,
    canvasHeight,
    activeLayer,
    onRenameLayer,
    onClearActiveLayer,
    onDuplicateActiveLayer,
  }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    const handleStartRename = () => {
      if (activeLayer) {
        setTempName(activeLayer.name);
        setIsEditingName(true);
      }
    };

    const handleSaveRename = () => {
      if (activeLayer && tempName.trim()) {
        onRenameLayer(activeLayer.id, tempName.trim());
        setIsEditingName(false);
      }
    };

    return (
      <div className="panel-section">
        <div
          className={`panel-header${isOpen ? '' : ' collapsed'}`}
          onClick={onToggle}
        >
          <span>
            <Sliders size={11} style={{ display: 'inline', marginRight: 5 }} />
            Propriedades (Properties)
          </span>
        </div>
        {isOpen && (
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* 1. Document Information */}
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              <div className="field-label" style={{ fontWeight: 'bold', fontSize: '10px' }}>DOCUMENTO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Largura: </span>
                  <span style={{ fontWeight: 5 }}>{canvasWidth} px</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Altura: </span>
                  <span style={{ fontWeight: 5 }}>{canvasHeight} px</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Resolução: </span>
                  <span>300 DPI</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cor: </span>
                  <span>RGB / 8 bits</span>
                </div>
              </div>
            </div>

            {/* 2. Active Layer Information */}
            {activeLayer ? (
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '6px', paddingTop: '2px' }}>
                <div className="field-label" style={{ fontWeight: 'bold', fontSize: '10px' }}>CAMADA ATIVA</div>
                
                {/* Layer Name Editor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        style={{
                          flex: 1,
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={handleSaveRename}
                        style={{
                          background: 'var(--accent-dim)',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          padding: '3px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <Check size={11} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span
                        style={{ fontWeight: 5, fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}
                        onClick={handleStartRename}
                        title="Double-click to rename layer"
                      >
                        {activeLayer.name}
                      </span>
                      <button
                        onClick={handleStartRename}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '9px',
                          cursor: 'pointer'
                        }}
                      >
                        [Renomear]
                      </button>
                    </div>
                  )}
                </div>

                {/* Layer Meta Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', marginTop: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Tipo: </span>
                    <span style={{ color: activeLayer.isSmartObject ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {activeLayer.isSmartObject ? 'Objeto Inteligente' : 'Camada Normal'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Opacidade: </span>
                    <span>{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Mesclagem: </span>
                    <span style={{ textTransform: 'capitalize' }}>{activeLayer.blendMode || 'normal'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '6px 0' }}>
                Nenhuma camada selecionada.
              </div>
            )}

            {/* 3. Layer Quick Actions */}
            {activeLayer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
                <div className="field-label" style={{ fontWeight: 'bold', fontSize: '10px' }}>AÇÕES RÁPIDAS</div>
                
                <button
                  className="panel-action-btn"
                  onClick={onDuplicateActiveLayer}
                  style={{ fontSize: '11px', padding: '4px' }}
                >
                  Duplicar Camada (Duplicate)
                </button>
                <button
                  className="panel-action-btn danger"
                  onClick={onClearActiveLayer}
                  style={{ fontSize: '11px', padding: '4px' }}
                >
                  Limpar Pixels (Clear pixels)
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }
);

PropertiesPanel.displayName = 'PropertiesPanel';
export default PropertiesPanel;
