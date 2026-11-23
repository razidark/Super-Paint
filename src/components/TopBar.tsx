import React, { useState, memo } from 'react';
import type { Tool } from '../types';

/**
 * The non-standard `beforeinstallprompt` event. Chrome fires it before the
 * PWA install prompt; it exposes `prompt()` and a `userChoice` promise.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: (format: string, quality?: number) => void;
  onPrint: () => void;
  onCopy: () => void;
  onClear: () => void;
  onNew: () => void;
  onOpen: () => void;
  onImport: () => void;
  onScan: () => void;
  isScanning: boolean;
  themePalette: string;
  onChangeThemePalette: (val: string) => void;
  zoomScale: number;
  onChangeZoomScale: (val: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  cursorPos: { x: number; y: number };

  tool: Tool;
  brushSize: number;
  onBrushSizeChange: (s: number) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  hardness: number;
  onHardnessChange: (h: number) => void;
  textFont: string;
  onTextFontChange: (f: string) => void;
  textSize: number;
  onTextSizeChange: (s: number) => void;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  fillColor: string;
  onFillColorChange: (c: string) => void;

  onFlip: (dir: 'horizontal' | 'vertical') => void;
  onRotate: (angle: number) => void;
  onAddLayer: () => void;
  onDuplicateActiveLayer: () => void;
  onDeleteLayer: (id: string) => void;
  activeLayerId: string;
  panelOpen: {
    color: boolean;
    properties: boolean;
    brush: boolean;
    filters: boolean;
    layers: boolean;
    transform: boolean;
  };
  onTogglePanel: (panel: 'color' | 'properties' | 'brush' | 'filters' | 'layers' | 'transform') => void;
}

const TopBar: React.FC<TopBarProps> = memo(
  ({
    onUndo,
    onRedo,
    onSave,
    onExport,
    onPrint,
    onCopy,
    onClear,
    onNew,
    onOpen,
    onImport,
    onScan,
    isScanning,
    themePalette,
    onChangeThemePalette,
    zoomScale,
    onChangeZoomScale,
    canvasWidth,
    canvasHeight,
    cursorPos,
    tool,
    brushSize,
    onBrushSizeChange,
    opacity,
    onOpacityChange,
    hardness,
    onHardnessChange,
    textFont,
    onTextFontChange,
    textSize,
    onTextSizeChange,
    brushColor,
    onBrushColorChange,
    fillColor,
    onFillColorChange,
    onFlip,
    onRotate,
    onAddLayer,
    onDuplicateActiveLayer,
    onDeleteLayer,
    activeLayerId,
    panelOpen,
    onTogglePanel,
  }) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    React.useEffect(() => {
      const handlePrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener('beforeinstallprompt', handlePrompt);
      return () => {
        window.removeEventListener('beforeinstallprompt', handlePrompt);
      };
    }, []);

    const handleInstall = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    };

    const handleMenuClick = (menu: string) => {
      setActiveDropdown((prev) => (prev === menu ? null : menu));
    };

    const handleMenuMouseEnter = (menu: string) => {
      if (activeDropdown !== null) {
        setActiveDropdown(menu);
      }
    };

    const closeDropdown = () => {
      setActiveDropdown(null);
    };

    // Helper to render checkmarks in Window menu
    const renderCheck = (isOpen: boolean) => {
      return isOpen ? ' ✓' : '  ';
    };

    // Helper to get Portuguese names for tools in Options ribbon
    const getToolName = (t: Tool) => {
      switch (t) {
        case 'brush': return 'Pincel (Brush)';
        case 'pencil': return 'Lápis (Pencil)';
        case 'eraser': return 'Borracha (Eraser)';
        case 'line': return 'Linha (Line)';
        case 'rectangle': return 'Retângulo (Rectangle)';
        case 'circle': return 'Círculo (Circle)';
        case 'triangle': return 'Triângulo (Triangle)';
        case 'star': return 'Estrela (Star)';
        case 'text': return 'Texto (Text)';
        case 'bucket': return 'Balde (Bucket)';
        case 'picker': return 'Conta-gotas (Picker)';
        case 'spray': return 'Spray Can';
        case 'symmetry': return 'Pincel Simétrico';
        case 'gradient': return 'Gradiente Linear';
        default: return 'Ferramenta';
      }
    };

    return (
      <div className="app-topbar-double">
        {/* Click outside overlay */}
        {activeDropdown && (
          <div
            className="menu-overlay"
            onClick={closeDropdown}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          />
        )}

        {/* Row 1: Photoshop Main Menus */}
        <div className="topbar-row-menu">
          <span className="topbar-logo" style={{ cursor: 'default' }}>🎨 Super Paint</span>

          {/* ARQUIVO Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'arquivo' ? 'active' : ''}`}
              onClick={() => handleMenuClick('arquivo')}
              onMouseEnter={() => handleMenuMouseEnter('arquivo')}
            >
              Arquivo (File)
            </button>
            {activeDropdown === 'arquivo' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onNew(); closeDropdown(); }}>
                  <span>Novo Documento...</span>
                  <span className="shortcut">Ctrl+N</span>
                </button>
                <button className="dropdown-item" onClick={() => { onOpen(); closeDropdown(); }}>
                  <span>Abrir Projeto...</span>
                  <span className="shortcut">Ctrl+O</span>
                </button>
                <button className="dropdown-item" onClick={() => { onImport(); closeDropdown(); }}>
                  <span>Importar como Camada...</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { onSave(); closeDropdown(); }}>
                  <span>Salvar Projeto</span>
                  <span className="shortcut">Ctrl+S</span>
                </button>
                <button className="dropdown-item" onClick={() => { onExport('png'); closeDropdown(); }}>
                  <span>Exportar como PNG (Lossless)</span>
                </button>
                <button className="dropdown-item" onClick={() => { onExport('jpeg', 0.92); closeDropdown(); }}>
                  <span>Exportar como JPEG (High)</span>
                </button>
                <button className="dropdown-item" onClick={() => { onExport('webp', 0.92); closeDropdown(); }}>
                  <span>Exportar como WebP</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { onScan(); closeDropdown(); }} disabled={isScanning}>
                  <span>{isScanning ? 'Digitalizando...' : 'Digitalizar (Scan)...'}</span>
                </button>
                <button className="dropdown-item" onClick={() => { onPrint(); closeDropdown(); }}>
                  <span>Imprimir Documento</span>
                  <span className="shortcut">Ctrl+P</span>
                </button>
              </div>
            )}
          </div>

          {/* EDITAR Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'editar' ? 'active' : ''}`}
              onClick={() => handleMenuClick('editar')}
              onMouseEnter={() => handleMenuMouseEnter('editar')}
            >
              Editar (Edit)
            </button>
            {activeDropdown === 'editar' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onUndo(); closeDropdown(); }}>
                  <span>Desfazer</span>
                  <span className="shortcut">Ctrl+Z</span>
                </button>
                <button className="dropdown-item" onClick={() => { onRedo(); closeDropdown(); }}>
                  <span>Refazer</span>
                  <span className="shortcut">Ctrl+Y</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { onCopy(); closeDropdown(); }}>
                  <span>Copiar Mesclado (Copy Composite)</span>
                </button>
                <button className="dropdown-item" onClick={() => { onClear(); closeDropdown(); }} style={{ color: 'var(--danger)' }}>
                  <span>Limpar Tela Inteira</span>
                </button>
              </div>
            )}
          </div>

          {/* IMAGEM Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'imagem' ? 'active' : ''}`}
              onClick={() => handleMenuClick('imagem')}
              onMouseEnter={() => handleMenuMouseEnter('imagem')}
            >
              Imagem (Image)
            </button>
            {activeDropdown === 'imagem' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onFlip('horizontal'); closeDropdown(); }}>
                  <span>Virar Horizontalmente (Flip H)</span>
                </button>
                <button className="dropdown-item" onClick={() => { onFlip('vertical'); closeDropdown(); }}>
                  <span>Virar Verticalmente (Flip V)</span>
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { onRotate(90); closeDropdown(); }}>
                  <span>Rotacionar 90° Horário</span>
                </button>
                <button className="dropdown-item" onClick={() => { onRotate(-90); closeDropdown(); }}>
                  <span>Rotacionar 90° Anti-horário</span>
                </button>
                <button className="dropdown-item" onClick={() => { onRotate(180); closeDropdown(); }}>
                  <span>Rotacionar 180°</span>
                </button>
              </div>
            )}
          </div>

          {/* CAMADA Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'camada' ? 'active' : ''}`}
              onClick={() => handleMenuClick('camada')}
              onMouseEnter={() => handleMenuMouseEnter('camada')}
            >
              Camada (Layer)
            </button>
            {activeDropdown === 'camada' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onAddLayer(); closeDropdown(); }}>
                  <span>Nova Camada</span>
                </button>
                <button className="dropdown-item" onClick={() => { onDuplicateActiveLayer(); closeDropdown(); }}>
                  <span>Duplicar Camada Ativa</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => { onDeleteLayer(activeLayerId); closeDropdown(); }}
                  style={{ color: 'var(--danger)' }}
                >
                  <span>Excluir Camada Ativa</span>
                </button>
              </div>
            )}
          </div>

          {/* FILTRO Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'filtro' ? 'active' : ''}`}
              onClick={() => handleMenuClick('filtro')}
              onMouseEnter={() => handleMenuMouseEnter('filtro')}
            >
              Filtro (Filter)
            </button>
            {activeDropdown === 'filtro' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onTogglePanel('filters'); closeDropdown(); }}>
                  <span>Abrir Painel de Ajustes...</span>
                </button>
              </div>
            )}
          </div>

          {/* JANELA Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'janela' ? 'active' : ''}`}
              onClick={() => handleMenuClick('janela')}
              onMouseEnter={() => handleMenuMouseEnter('janela')}
            >
              Janela (Window)
            </button>
            {activeDropdown === 'janela' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button className="dropdown-item" onClick={() => { onTogglePanel('color'); closeDropdown(); }}>
                  <span>{renderCheck(panelOpen.color)} Cores</span>
                </button>
                <button className="dropdown-item" onClick={() => { onTogglePanel('properties'); closeDropdown(); }}>
                  <span>{renderCheck(panelOpen.properties)} Propriedades</span>
                </button>
                <button className="dropdown-item" onClick={() => { onTogglePanel('filters'); closeDropdown(); }}>
                  <span>{renderCheck(panelOpen.filters)} Filtros & Ajustes</span>
                </button>
                <button className="dropdown-item" onClick={() => { onTogglePanel('transform'); closeDropdown(); }}>
                  <span>{renderCheck(panelOpen.transform)} Transformações</span>
                </button>
                <button className="dropdown-item" onClick={() => { onTogglePanel('layers'); closeDropdown(); }}>
                  <span>{renderCheck(panelOpen.layers)} Camadas</span>
                </button>
              </div>
            )}
          </div>

          {/* AJUDA Dropdown */}
          <div className="dropdown-container">
            <button
              className={`menu-btn ${activeDropdown === 'ajuda' ? 'active' : ''}`}
              onClick={() => handleMenuClick('ajuda')}
              onMouseEnter={() => handleMenuMouseEnter('ajuda')}
            >
              Ajuda (Help)
            </button>
            {activeDropdown === 'ajuda' && (
              <div className="menu-dropdown" style={{ zIndex: 999 }}>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    alert('🎨 Super Paint v1.0.0\n\nPhotoshop-inspired pixel editor featuring layers, non-destructive Smart Objects, rules guidelines, custom HSV color pickers, and advanced filters.');
                    closeDropdown();
                  }}
                >
                  <span>Sobre o Super Paint...</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    alert('Atalhos Úteis:\n• B - Pincel\n• E - Borracha\n• I - Conta-gotas\n• Ctrl+Z - Desfazer\n• Ctrl+Y - Refazer\n• Ctrl+S - Salvar PNG\n• Ctrl+P - Imprimir');
                    closeDropdown();
                  }}
                >
                  <span>Atalhos do Teclado</span>
                </button>
              </div>
            )}
          </div>

          <div className="topbar-spacer" />

          {/* UI Zoom Controller (Accessibility) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Zoom:</span>
            <select
              value={zoomScale}
              onChange={(e) => onChangeZoomScale(+e.target.value)}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                width: '65px',
                height: '22px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
              title="UI Accessibility Scaling"
            >
              <option value={0.8}>80%</option>
              <option value={0.9}>90%</option>
              <option value={1.0}>100%</option>
              <option value={1.1}>110%</option>
              <option value={1.2}>120%</option>
              <option value={1.3}>130%</option>
              <option value={1.4}>140%</option>
              <option value={1.5}>150%</option>
            </select>
          </div>

          <div className="topbar-sep" />

          {/* Theme Palette Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tema:</span>
            <select
              value={themePalette}
              onChange={(e) => onChangeThemePalette(e.target.value)}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                width: '105px',
                height: '22px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
              title="UI Color Customization"
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
              <option value="high-contrast">High Contrast</option>
              <option value="amber">Retro Amber</option>
              <option value="cyberpunk">Cyberpunk</option>
            </select>
          </div>

          <div className="topbar-sep" />

          {/* PWA Install Button */}
          {installPrompt && (
            <>
              <button
                onClick={handleInstall}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '22px'
                }}
              >
                <span>Install App</span>
              </button>
              <div className="topbar-sep" />
            </>
          )}

          {/* Stats details */}
          <span className="topbar-info" style={{ fontSize: '10px', cursor: 'default' }}>
            {canvasWidth} × {canvasHeight} px &nbsp;|&nbsp;
            {cursorPos.x}, {cursorPos.y}
          </span>
        </div>

        {/* Row 2: Photoshop Options Ribbon */}
        <div className="topbar-row-options">
          <span style={{ fontWeight: 'bold', color: 'var(--accent)', marginRight: '4px' }}>
            {getToolName(tool)}:
          </span>

          {/* Group 1: Size & Thickness */}
          {['brush', 'pencil', 'eraser', 'spray', 'symmetry', 'line', 'rectangle', 'circle', 'triangle', 'star'].includes(tool) && (
            <div className="option-group">
              <label>{['line', 'rectangle', 'circle', 'triangle', 'star'].includes(tool) ? 'Espessura' : 'Tamanho'}:</label>
              <input
                type="range"
                min={1}
                max={150}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(+e.target.value)}
              />
              <span>{brushSize}px</span>
            </div>
          )}

          {/* Group 2: Hardness (Pencil doesn't use hardness) */}
          {['brush', 'eraser', 'spray', 'symmetry'].includes(tool) && (
            <div className="option-group">
              <label>Dureza:</label>
              <input
                type="range"
                min={0}
                max={100}
                value={hardness}
                onChange={(e) => onHardnessChange(+e.target.value)}
              />
              <span>{hardness}%</span>
            </div>
          )}

          {/* Group 3: Tool Opacity */}
          {tool !== 'picker' && tool !== 'bucket' && (
            <div className="option-group">
              <label>Opacidade:</label>
              <input
                type="range"
                min={1}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => onOpacityChange(+e.target.value / 100)}
              />
              <span>{Math.round(opacity * 100)}%</span>
            </div>
          )}

          {/* Group 4: Text Controls */}
          {tool === 'text' && (
            <>
              <div className="option-group">
                <label>Fonte:</label>
                <select value={textFont} onChange={(e) => onTextFontChange(e.target.value)}>
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Impact">Impact</option>
                  <option value="Times New Roman">Times New Roman</option>
                </select>
              </div>
              <div className="option-group">
                <label>Tamanho do Texto:</label>
                <input
                  type="range"
                  min={8}
                  max={120}
                  value={textSize}
                  onChange={(e) => onTextSizeChange(+e.target.value)}
                />
                <span>{textSize}px</span>
              </div>
            </>
          )}

          {/* Group 5: Active Swatches Preview in options ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>FG:</span>
            <div
              style={{
                width: '14px',
                height: '14px',
                background: brushColor,
                border: '1px solid var(--border-light)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
              onClick={() => onBrushColorChange(brushColor)}
              title="Foreground Color Swatch"
            />
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>BG:</span>
            <div
              style={{
                width: '14px',
                height: '14px',
                background: fillColor,
                border: '1px solid var(--border-light)',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
              onClick={() => onFillColorChange(fillColor)}
              title="Background Color Swatch"
            />
          </div>
        </div>
      </div>
    );
  }
);

TopBar.displayName = 'TopBar';
export default TopBar;
