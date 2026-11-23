import React, { useState, useRef, useCallback, useEffect } from 'react';
import CanvasEditor from './components/Canvas';
import type { CanvasHandle } from './components/Canvas';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';

import FiltersPanel from './components/FiltersPanel';
import LayersPanel from './components/LayersPanel';
import TransformPanel from './components/TransformPanel';
import ColorPanel from './components/ColorPanel';
import PropertiesPanel from './components/PropertiesPanel';
import PressureIndicator from './components/PressureIndicator';
import { useHistory } from './hooks/useHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DEFAULT_FILTERS } from './constants';
import type { Tool, LayerMetadata, ImageFilters, SmartTransforms, BlendMode } from './types';

// ---- Layer factory ----
let layerCounter = 1;
function makeLayer(name?: string): LayerMetadata {
  return {
    id: `layer-${Date.now()}-${layerCounter++}`,
    name: name ?? `Layer ${layerCounter - 1}`,
    visible: true,
    opacity: 1,
  };
}

const App: React.FC = () => {
  const canvasRef = useRef<CanvasHandle>(null);

  // ---- Canvas dimensions state ----
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);

  // ---- Smart Object Editor States ----
  const [smartObjectWarningOpen, setSmartObjectWarningOpen] = useState(false);
  const [editingSmartObjectId, setEditingSmartObjectId] = useState<string | null>(null);
  const [smartEditorColor, setSmartEditorColor] = useState('#1a1a2e');
  const [smartEditorSize, setSmartEditorSize] = useState(12);
  const [smartEditorTool, setSmartEditorTool] = useState<'brush' | 'eraser'>('brush');
  const [smartEditorWidth, setSmartEditorWidth] = useState(800);
  const [smartEditorHeight, setSmartEditorHeight] = useState(600);

  // ---- Tool state ----
  const [tool, setTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#1a1a2e');
  const [fillColor, setFillColor] = useState('#4a9eff');
  const [brushSize, setBrushSize] = useState(12);
  const [opacity, setOpacity] = useState(1);
  const [hardness, setHardness] = useState(80);
  const [textContent] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textSize, setTextSize] = useState(24);

  // ---- Filters ----
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);

  // ---- Layers ----
  const [layers, setLayers] = useState<LayerMetadata[]>(() => [
    makeLayer('Background'),
  ]);
  const [activeLayerId, setActiveLayerId] = useState(() => layers[0]?.id ?? '');

  // ---- Accessibility Theme & Scaling States ----
  const [themePalette, setThemePalette] = useState<string>(() => {
    return localStorage.getItem('super_paint_theme_palette') || 'dark';
  });

  const [zoomScale, setZoomScale] = useState<number>(() => {
    return +(localStorage.getItem('super_paint_zoom_scale') || '1.0');
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'high-contrast-theme', 'amber-theme', 'cyberpunk-theme');
    if (themePalette !== 'dark') {
      root.classList.add(`${themePalette}-theme`);
    }
    localStorage.setItem('super_paint_theme_palette', themePalette);
  }, [themePalette]);

  useEffect(() => {
    document.documentElement.style.zoom = String(zoomScale);
    localStorage.setItem('super_paint_zoom_scale', String(zoomScale));
  }, [zoomScale]);

  // Sync canvas when layers change
  useEffect(() => {
    for (const layer of layers) {
      canvasRef.current?.addLayer(layer.id);
    }
  }, [layers]);

  // ---- History (undo/redo) ----
  const { saveHistory, undo, redo, clearHistory } = useHistory(
    canvasRef,
    layers,
    activeLayerId,
    setLayers,
    setActiveLayerId
  );

  // ---- Panel collapse state ----
  const [panelOpen, setPanelOpen] = useState({
    color: true,
    properties: true,
    brush: true,
    filters: false,
    layers: true,
    transform: false,
  });

  const toggleColorPanel = useCallback(
    () => setPanelOpen((p) => ({ ...p, color: !p.color })),
    []
  );
  const togglePropertiesPanel = useCallback(
    () => setPanelOpen((p) => ({ ...p, properties: !p.properties })),
    []
  );
  const toggleFiltersPanel = useCallback(
    () => setPanelOpen((p) => ({ ...p, filters: !p.filters })),
    []
  );
  const toggleLayersPanel = useCallback(
    () => setPanelOpen((p) => ({ ...p, layers: !p.layers })),
    []
  );
  const toggleTransformPanel = useCallback(
    () => setPanelOpen((p) => ({ ...p, transform: !p.transform })),
    []
  );

  // ---- Layer Transformations ----
  const handleFlip = useCallback((direction: 'horizontal' | 'vertical') => {
    if (!activeLayerId) return;
    canvasRef.current?.flipLayer(activeLayerId, direction);
    saveHistory();
  }, [activeLayerId, saveHistory]);

  const handleRotate = useCallback((angle: number) => {
    if (!activeLayerId) return;
    canvasRef.current?.rotateLayer(activeLayerId, angle);
    saveHistory();
  }, [activeLayerId, saveHistory]);

  const handleScale = useCallback((sx: number, sy: number) => {
    if (!activeLayerId) return;
    canvasRef.current?.scaleLayer(activeLayerId, sx, sy);
    saveHistory();
  }, [activeLayerId, saveHistory]);

  // ---- Canvas Document Resizing with layer backup & restore ----
  const pendingResizeBackups = useRef<{ [layerId: string]: string } | null>(null);

  const handleResizeCanvas = useCallback((w: number, h: number) => {
    const backups: { [layerId: string]: string } = {};
    for (const layer of layers) {
      backups[layer.id] = canvasRef.current?.getLayerDataUrl(layer.id) ?? '';
    }
    pendingResizeBackups.current = backups;
    setCanvasWidth(w);
    setCanvasHeight(h);
  }, [layers]);

  useEffect(() => {
    if (pendingResizeBackups.current) {
      const backups = pendingResizeBackups.current;
      pendingResizeBackups.current = null;
      
      const promises = layers.map((layer) => {
        const dataUrl = backups[layer.id];
        if (dataUrl) {
          return canvasRef.current?.setLayerData(layer.id, dataUrl);
        }
        return Promise.resolve();
      });

      Promise.all(promises).then(() => {
        saveHistory();
      });
    }
  }, [canvasWidth, canvasHeight, layers, saveHistory]);

  // ---- Export / Save / Print ----
  const handleExport = useCallback(
    (format: string, quality = 0.92) => {
      const dataUrl =
        canvasRef.current?.getCompositeDataUrl(format, quality) ?? '';
      if (!dataUrl) return;

      if (window.electronAPI?.saveCanvasData) {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        window.electronAPI.saveCanvasData(base64);
      } else {
        // Web fallback: download via link
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `super-paint.${format === 'jpeg' ? 'jpg' : format}`;
        a.click();
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    handleExport('png');
  }, [handleExport]);

  const handlePrint = useCallback(() => {
    if (window.electronAPI?.printImage) {
      window.electronAPI.printImage();
    } else {
      window.print();
    }
  }, []);

  const handleCopy = useCallback(() => {
    const dataUrl = canvasRef.current?.getCompositeDataUrl('png', 1) ?? '';
    navigator.clipboard?.writeText(dataUrl);
  }, []);

  const clearCanvas = useCallback(() => {
    canvasRef.current?.clearAll();
    saveHistory();
  }, [saveHistory]);

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({
    undo,
    redo,
    handleSave,
    handlePrint,
    setTool,
    setBrushSize,
  });

  // ---- Smart Object Operations ----
  const handleConvertToSmartObject = useCallback((id: string) => {
    const sourceDataUrl = canvasRef.current?.getLayerDataUrl(id) ?? '';
    const nextLayers = layers.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          isSmartObject: true,
          smartObjectSource: sourceDataUrl,
          smartTransforms: {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            filters: { brightness: 100, contrast: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 }
          }
        };
      }
      return l;
    });
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  const handleRasterizeLayer = useCallback((id: string) => {
    const nextLayers = layers.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          isSmartObject: false,
          smartObjectSource: undefined,
          smartTransforms: undefined
        };
      }
      return l;
    });
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  const handleUpdateSmartTransforms = useCallback((t: SmartTransforms) => {
    if (!activeLayerId) return;
    const nextLayers = layers.map((l) => {
      if (l.id === activeLayerId) {
        return {
          ...l,
          smartTransforms: t
        };
      }
      return l;
    });
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  const handleEditSmartObject = useCallback((id: string) => {
    const target = layers.find(l => l.id === id);
    if (target) {
      setSmartEditorColor(brushColor);
      setSmartEditorSize(brushSize);
      setSmartEditorTool('brush');
      setEditingSmartObjectId(id);
    }
  }, [layers, brushColor, brushSize]);

  const smartEditorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smartEditorIsDrawing = useRef(false);
  const smartEditorLastPos = useRef({ x: 0, y: 0 });
  // Latest `layers` for the smart-object preview effect. Reading it through a
  // ref keeps the effect keyed on `editingSmartObjectId` only: adding
  // `layers` to the dependency array would re-draw the preview canvas and
  // discard the user's in-progress edits whenever any layer changes.
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const getSmartEditorPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = smartEditorCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleSmartEditorPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = smartEditorCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    smartEditorIsDrawing.current = true;
    const pos = getSmartEditorPos(e);
    smartEditorLastPos.current = pos;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = smartEditorTool === 'eraser' ? '#ffffff' : smartEditorColor;
    ctx.globalCompositeOperation = smartEditorTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = smartEditorSize;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleSmartEditorPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!smartEditorIsDrawing.current) return;
    const canvas = smartEditorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = smartEditorTool === 'eraser' ? '#ffffff' : smartEditorColor;
    ctx.globalCompositeOperation = smartEditorTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = smartEditorSize;

    const pos = getSmartEditorPos(e);
    ctx.beginPath();
    ctx.moveTo(smartEditorLastPos.current.x, smartEditorLastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    smartEditorLastPos.current = pos;
  };

  const handleSmartEditorPointerUp = () => {
    smartEditorIsDrawing.current = false;
  };

  useEffect(() => {
    if (editingSmartObjectId) {
      const target = layersRef.current.find(l => l.id === editingSmartObjectId);
      if (target && target.smartObjectSource) {
        const img = new Image();
        img.onload = () => {
          setSmartEditorWidth(img.width);
          setSmartEditorHeight(img.height);
          
          setTimeout(() => {
            const canvas = smartEditorCanvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
              }
            }
          }, 50);
        };
        img.src = target.smartObjectSource;
      }
    }
  }, [editingSmartObjectId]);

  const handleSaveSmartObjectEdit = () => {
    const canvas = smartEditorCanvasRef.current;
    if (canvas && editingSmartObjectId) {
      const dataUrl = canvas.toDataURL();
      const nextLayers = layers.map(l => {
        if (l.id === editingSmartObjectId) {
          return {
            ...l,
            smartObjectSource: dataUrl
          };
        }
        return l;
      });
      setLayers(nextLayers);
      saveHistory(nextLayers, activeLayerId);
      setEditingSmartObjectId(null);
    }
  };

  const handleRenameLayer = useCallback((id: string, name: string) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, name } : l));
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  const handleClearActiveLayer = useCallback(() => {
    if (!activeLayerId) return;
    canvasRef.current?.clearLayer(activeLayerId);
    saveHistory();
  }, [activeLayerId, saveHistory]);

  const handleDuplicateActiveLayer = useCallback(() => {
    if (!activeLayerId) return;
    const sourceLayer = layers.find((l) => l.id === activeLayerId);
    if (!sourceLayer) return;

    const dataUrl = canvasRef.current?.getLayerDataUrl(activeLayerId) ?? '';
    const duplicate = makeLayer(`${sourceLayer.name} Copy`);
    duplicate.opacity = sourceLayer.opacity;
    duplicate.blendMode = sourceLayer.blendMode;
    duplicate.isSmartObject = sourceLayer.isSmartObject;
    duplicate.smartObjectSource = sourceLayer.smartObjectSource;
    if (sourceLayer.smartTransforms) {
      duplicate.smartTransforms = { ...sourceLayer.smartTransforms };
    }

    const nextLayers = [...layers, duplicate];
    setLayers(nextLayers);
    setActiveLayerId(duplicate.id);

    canvasRef.current?.addLayer(duplicate.id);
    if (dataUrl) {
      canvasRef.current?.setLayerData(duplicate.id, dataUrl).then(() => {
        saveHistory(nextLayers, duplicate.id);
      });
    } else {
      saveHistory(nextLayers, duplicate.id);
    }
  }, [layers, activeLayerId, saveHistory]);

  // ---- Layers management ----
  const addLayer = useCallback(() => {
    const newLayer = makeLayer();
    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setActiveLayerId(newLayer.id);
    canvasRef.current?.addLayer(newLayer.id);
    saveHistory(nextLayers, newLayer.id);
  }, [layers, saveHistory]);

  const deleteLayer = useCallback(
    (id: string) => {
      if (layers.length <= 1) return;
      canvasRef.current?.deleteLayer(id);
      const remaining = layers.filter((l) => l.id !== id);
      const nextActiveId = activeLayerId === id
        ? (remaining[remaining.length - 1]?.id ?? '')
        : activeLayerId;
      setLayers(remaining);
      setActiveLayerId(nextActiveId);
      saveHistory(remaining, nextActiveId);
    },
    [layers, activeLayerId, saveHistory]
  );

  const toggleLayerVisibility = useCallback((id: string) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  const setLayerOpacity = useCallback((id: string, val: number) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, opacity: val } : l));
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  // ---- Apply filters to active layer ----
  const applyFilters = useCallback(() => {
    canvasRef.current?.applyFiltersToLayer(activeLayerId, filters);
    setFilters(DEFAULT_FILTERS); // Reset adjustments panel state after baking
    saveHistory();
  }, [activeLayerId, filters, saveHistory]);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // ---- Layer Blend Mode Handling ----
  const setLayerBlendMode = useCallback((id: string, val: BlendMode) => {
    const nextLayers = layers.map((l) => (l.id === id ? { ...l, blendMode: val } : l));
    setLayers(nextLayers);
    saveHistory(nextLayers, activeLayerId);
  }, [layers, activeLayerId, saveHistory]);

  // ---- Scanner Integration State & Handlers ----
  const [isScanning, setIsScanning] = useState(false);
  const [showScannerErrorModal, setShowScannerErrorModal] = useState(false);

  const handleScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    if (window.electronAPI?.scanImage) {
      try {
        const res = await window.electronAPI.scanImage();
        if (typeof res === 'string' && res.startsWith('data:image')) {
          const scanLayer = makeLayer('Scanned Document');
          const nextLayers = [...layers, scanLayer];
          setLayers(nextLayers);
          setActiveLayerId(scanLayer.id);
          canvasRef.current?.addLayer(scanLayer.id);
          canvasRef.current?.setLayerData(scanLayer.id, res).then(() => {
            saveHistory(nextLayers, scanLayer.id);
          });
        } else {
          setShowScannerErrorModal(true);
        }
      } catch (err) {
        console.error('Scan invoke failed:', err);
        setShowScannerErrorModal(true);
      }
    } else {
      setShowScannerErrorModal(true);
    }
    setIsScanning(false);
  }, [layers, isScanning, saveHistory]);

  const handleSimulateScan = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Warm scanner paper background
    ctx.fillStyle = '#fdfcf7';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Scan grain noise
    for (let i = 0; i < 60000; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;
      const color = Math.random() > 0.5 ? 245 : 160;
      ctx.fillStyle = `rgba(${color},${color},${color},0.09)`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Scanner optical vertical lines
    ctx.strokeStyle = 'rgba(80,100,220,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * canvasWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Document header info
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 32px Courier New';
    ctx.fillText('WIA DOCUMENT SCANNER RESULT', 80, 100);
    
    ctx.font = '15px Courier New';
    ctx.fillText(`Timestamp:  ${new Date().toLocaleString()}`, 80, 140);
    ctx.fillText(`Device:     Virtual WIA Scanner Driver v2.6`, 80, 165);
    ctx.fillText(`Resolution: 300 DPI (Fallback Emulation)`, 80, 190);

    // Mock paragraphs text
    ctx.fillStyle = '#222222';
    ctx.font = '16px Courier New';
    const textLines = [
      'This image represents a physical scanned sheet loaded into Super Paint.',
      'Normally, the application invokes the local OS-level PowerShell command',
      'that queries WIA (Windows Image Acquisition) to open the scan dialogue.',
      '',
      'Since no active hardware scanners were connected to your device registry,',
      'this high-fidelity scanner layout emulator was generated for testing.',
      '',
      '------------------ DIAGNOSTIC AUDIT LOGS ------------------',
      '• Connection Status: DEGRADED (NO_HARDWARE_FOUND)',
      '• API Route Trigger: IPC invoke(\'scan-image\') in Electron wrapper',
      '• Script Payload:    $wia = New-Object -ComObject WIA.CommonDialog',
      '• Fallback State:    Simulated canvas data URL import',
      '',
      'You can paint over this document layer, toggle its visibility, or apply',
      'adjustments such as Contrast and Invert in the panel to test filter logic.'
    ];
    let startY = 260;
    textLines.forEach(line => {
      ctx.fillText(line, 80, startY);
      startY += 24;
    });

    // Draw barcode in top corner
    ctx.fillStyle = '#000000';
    let startX = canvasWidth - 230;
    let startYBarcode = 80;
    ctx.fillRect(startX, startYBarcode, 150, 4);
    startYBarcode += 8;
    for (let b = 0; b < 28; b++) {
      const w = Math.random() > 0.45 ? 5 : 2;
      ctx.fillRect(startX, startYBarcode, w, 40);
      startX += w + (Math.random() > 0.4 ? 4 : 1);
    }

    // Add randomized scan paper skew angle
    const skewedCanvas = document.createElement('canvas');
    skewedCanvas.width = canvasWidth;
    skewedCanvas.height = canvasHeight;
    const skewedCtx = skewedCanvas.getContext('2d')!;
    skewedCtx.translate(canvasWidth / 2, canvasHeight / 2);
    skewedCtx.rotate((Math.random() * 1.6 - 0.8) * Math.PI / 180); // Rotate by +-0.8 degrees
    skewedCtx.drawImage(canvas, -canvasWidth / 2, -canvasHeight / 2);

    const finalScanData = skewedCanvas.toDataURL();
    const scanLayer = makeLayer('Scanned Document');
    const nextLayers = [...layers, scanLayer];
    
    setLayers(nextLayers);
    setActiveLayerId(scanLayer.id);
    canvasRef.current?.addLayer(scanLayer.id);
    canvasRef.current?.setLayerData(scanLayer.id, finalScanData).then(() => {
      saveHistory(nextLayers, scanLayer.id);
    });

    setShowScannerErrorModal(false);
  }, [layers, canvasWidth, canvasHeight, saveHistory]);

  // ---- Pressure state ----
  const [pressure, setPressure] = useState(0);
  const pressureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressure = useCallback((p: number) => {
    setPressure(p);
    if (pressureTimeout.current) clearTimeout(pressureTimeout.current);
    if (p > 0) {
      pressureTimeout.current = setTimeout(() => setPressure(0), 300);
    }
  }, []);

  // ---- Cursor position for status bar ----
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // ---- Photoshop-style New File Modal ----
  const [showNewModal, setShowNewModal] = useState(false);
  const [newWidth, setNewWidth] = useState(1200);
  const [newHeight, setNewHeight] = useState(800);
  const [newBgColor, setNewBgColor] = useState<'transparent' | 'white' | 'black'>('transparent');
  const [preset, setPreset] = useState('1200x800');

  const handleNew = useCallback(() => {
    setShowNewModal(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);
    
    const isTransparent = newBgColor === 'transparent';
    const bgLayer = makeLayer(isTransparent ? 'Layer 1' : 'Background');
    
    setLayers([bgLayer]);
    setActiveLayerId(bgLayer.id);
    clearHistory();
    
    canvasRef.current?.clearAll();
    canvasRef.current?.addLayer(bgLayer.id);

    if (!isTransparent) {
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = newBgColor === 'white' ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, newWidth, newHeight);
      canvasRef.current?.setLayerData(bgLayer.id, canvas.toDataURL()).then(() => {
        saveHistory([bgLayer], bgLayer.id);
      });
    } else {
      saveHistory([bgLayer], bgLayer.id);
    }
    
    setShowNewModal(false);
  }, [newWidth, newHeight, newBgColor, clearHistory, saveHistory]);

  const handlePresetChange = (val: string) => {
    setPreset(val);
    if (val === '1920x1080') {
      setNewWidth(1920);
      setNewHeight(1080);
    } else if (val === '1280x720') {
      setNewWidth(1280);
      setNewHeight(720);
    } else if (val === '1080x1080') {
      setNewWidth(1080);
      setNewHeight(1080);
    } else if (val === '1024x768') {
      setNewWidth(1024);
      setNewHeight(768);
    } else if (val === '1200x800') {
      setNewWidth(1200);
      setNewHeight(800);
    }
  };

  // ---- Open/Import File Handling ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileOpenMode, setFileOpenMode] = useState<'new' | 'layer'>('layer');

  const handleOpen = useCallback(() => {
    setFileOpenMode('new');
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback(() => {
    setFileOpenMode('layer');
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (!dataUrl) return;

        const name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const newLayer = makeLayer(name);

        if (fileOpenMode === 'new') {
          // Open as new project: resize canvas to fit loaded image
          const img = new Image();
          img.onload = () => {
            setCanvasWidth(img.width);
            setCanvasHeight(img.height);
            setLayers([newLayer]);
            setActiveLayerId(newLayer.id);
            clearHistory();
            canvasRef.current?.clearAll();
            canvasRef.current?.addLayer(newLayer.id);
            canvasRef.current?.setLayerData(newLayer.id, dataUrl).then(() => {
              saveHistory([newLayer], newLayer.id);
            });
          };
          img.src = dataUrl;
        } else {
          // Import as layer in active project
          const nextLayers = [...layers, newLayer];
          setLayers(nextLayers);
          setActiveLayerId(newLayer.id);
          canvasRef.current?.addLayer(newLayer.id);
          canvasRef.current?.setLayerData(newLayer.id, dataUrl).then(() => {
            saveHistory(nextLayers, newLayer.id);
          });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [fileOpenMode, layers, saveHistory, clearHistory]
  );

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Wire keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+P, tool keys, [ and ] for brush size)
  useKeyboardShortcuts({
    undo,
    redo,
    handleSave,
    handlePrint,
    setTool,
    setBrushSize,
  });

  return (
    <div className="app-layout">
      <TopBar
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onExport={handleExport}
        onPrint={handlePrint}
        onCopy={handleCopy}
        onClear={clearCanvas}
        onNew={handleNew}
        onOpen={handleOpen}
        onImport={handleImport}
        onScan={handleScan}
        isScanning={isScanning}
        themePalette={themePalette}
        onChangeThemePalette={setThemePalette}
        zoomScale={zoomScale}
        onChangeZoomScale={setZoomScale}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        cursorPos={cursorPos}
        tool={tool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        opacity={opacity}
        onOpacityChange={setOpacity}
        hardness={hardness}
        onHardnessChange={setHardness}
        textFont={textFont}
        onTextFontChange={setTextFont}
        textSize={textSize}
        onTextSizeChange={setTextSize}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        fillColor={fillColor}
        onFillColorChange={setFillColor}
        onFlip={handleFlip}
        onRotate={handleRotate}
        onAddLayer={addLayer}
        onDuplicateActiveLayer={handleDuplicateActiveLayer}
        onDeleteLayer={deleteLayer}
        activeLayerId={activeLayerId}
        panelOpen={panelOpen}
        onTogglePanel={(panel) => {
          setPanelOpen((p) => ({ ...p, [panel]: !p[panel] }));
        }}
      />

      <div className="app-body">
        <Toolbar tool={tool} onToolChange={setTool} />

        <div
          className="app-canvas-area"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursorPos({
              x: Math.round(e.clientX - rect.left),
              y: Math.round(e.clientY - rect.top),
            });
          }}
        >
          <CanvasEditor
            ref={canvasRef}
            tool={tool}
            brushColor={brushColor}
            fillColor={fillColor}
            brushSize={brushSize}
            opacity={opacity}
            hardness={hardness}
            layers={layers}
            activeLayerId={activeLayerId}
            filters={filters}
            textContent={textContent}
            textFont={textFont}
            textSize={textSize}
            onPickColor={setBrushColor}
            onPressureChange={handlePressure}
            onStrokeComplete={saveHistory}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            activeLayerIsSmartObject={activeLayer?.isSmartObject || false}
            onSmartObjectWarning={() => setSmartObjectWarningOpen(true)}
          />
        </div>

        <div className="app-right-panel">
          <ColorPanel
            isOpen={panelOpen.color}
            onToggle={toggleColorPanel}
            brushColor={brushColor}
            fillColor={fillColor}
            onBrushColorChange={setBrushColor}
            onFillColorChange={setFillColor}
          />

          <PropertiesPanel
            isOpen={panelOpen.properties}
            onToggle={togglePropertiesPanel}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            activeLayer={activeLayer}
            onRenameLayer={handleRenameLayer}
            onClearActiveLayer={handleClearActiveLayer}
            onDuplicateActiveLayer={handleDuplicateActiveLayer}
          />


          <FiltersPanel
            isOpen={panelOpen.filters}
            onToggle={toggleFiltersPanel}
            filters={filters}
            onFiltersChange={setFilters}
            onApply={applyFilters}
            onReset={resetFilters}
          />

          <TransformPanel
            isOpen={panelOpen.transform}
            onToggle={toggleTransformPanel}
            onFlip={handleFlip}
            onRotate={handleRotate}
            onScale={handleScale}
            onResizeCanvas={handleResizeCanvas}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isActiveLayerSmartObject={activeLayer?.isSmartObject || false}
            smartTransforms={activeLayer?.smartTransforms}
            onUpdateSmartTransforms={handleUpdateSmartTransforms}
          />

          <LayersPanel
            isOpen={panelOpen.layers}
            onToggle={toggleLayersPanel}
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={addLayer}
            onDeleteLayer={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
            onSetOpacity={setLayerOpacity}
            onSetBlendMode={setLayerBlendMode}
            onConvertToSmartObject={handleConvertToSmartObject}
            onEditSmartObject={handleEditSmartObject}
            onRasterizeLayer={handleRasterizeLayer}
          />
        </div>
      </div>

      <PressureIndicator pressure={pressure} />

      {/* Hidden Open File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Photoshop-style New File Modal */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">New Document</div>
            
            <div className="modal-row">
              <label>Preset</label>
              <select value={preset} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="1200x800">Default (1200 × 800)</option>
                <option value="1920x1080">Full HD (1920 × 1080)</option>
                <option value="1280x720">HD (1280 × 720)</option>
                <option value="1080x1080">Square (1080 × 1080)</option>
                <option value="1024x768">Web Classic (1024 × 768)</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="modal-row">
              <label>Width (px)</label>
              <input
                type="number"
                value={newWidth}
                onChange={(e) => {
                  setNewWidth(+e.target.value);
                  setPreset('custom');
                }}
              />
            </div>

            <div className="modal-row">
              <label>Height (px)</label>
              <input
                type="number"
                value={newHeight}
                onChange={(e) => {
                  setNewHeight(+e.target.value);
                  setPreset('custom');
                }}
              />
            </div>

            <div className="modal-row">
              <label>Background Contents</label>
              <select
                value={newBgColor}
                onChange={(e) => setNewBgColor(e.target.value as 'transparent' | 'white' | 'black')}
              >
                <option value="transparent">Transparent</option>
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button className="modal-btn primary" onClick={handleCreateNew}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Diagnostic / Simulation Dialog */}
      {showScannerErrorModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '380px' }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
              <span>⚠️ Scanner Offline</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
              No physical image acquisition device (scanner or camera) was detected by the Windows WIA API.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.4' }}>
              Would you like to simulate a scanned document layer to test drawing, edits, and filters?
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setShowScannerErrorModal(false)}
              >
                Close
              </button>
              <button className="modal-btn primary" onClick={handleSimulateScan}>
                Simulate Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Object Warning Modal */}
      {smartObjectWarningOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '360px' }}>
            <div className="modal-title" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️ Smart Object Locked</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
              This layer is a Smart Object. Direct painting is not allowed to preserve image fidelity.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.4' }}>
              To edit the contents of this Smart Object, click "Edit Contents" in the layers panel. Alternatively, you can rasterize the layer to paint directly on it.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setSmartObjectWarningOpen(false)}
              >
                Close
              </button>
              <button
                className="modal-btn primary"
                onClick={() => {
                  handleRasterizeLayer(activeLayerId);
                  setSmartObjectWarningOpen(false);
                }}
              >
                Rasterize Layer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Object Content Editor Modal */}
      {editingSmartObjectId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✏️ Edit Smart Object Contents</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Original Size: {smartEditorWidth} × {smartEditorHeight}px</span>
            </div>
            
            {/* Editor toolbar */}
            <div style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`topbar-btn ${smartEditorTool === 'brush' ? 'accent' : ''}`}
                style={{
                  background: smartEditorTool === 'brush' ? 'var(--accent-dim)' : 'transparent',
                  color: smartEditorTool === 'brush' ? 'var(--accent)' : 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={() => setSmartEditorTool('brush')}
              >
                Brush Tool
              </button>
              <button
                className={`topbar-btn ${smartEditorTool === 'eraser' ? 'accent' : ''}`}
                style={{
                  background: smartEditorTool === 'eraser' ? 'var(--accent-dim)' : 'transparent',
                  color: smartEditorTool === 'eraser' ? 'var(--accent)' : 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={() => setSmartEditorTool('eraser')}
              >
                Eraser
              </button>
              
              <div className="topbar-sep" />
              
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Brush Color:</span>
              <input
                type="color"
                value={smartEditorColor}
                onChange={(e) => setSmartEditorColor(e.target.value)}
                style={{ width: '22px', height: '22px', border: '1px solid var(--border)', padding: 0, borderRadius: '4px', cursor: 'pointer' }}
              />

              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Size:</span>
              <input
                type="range"
                min={1}
                max={100}
                value={smartEditorSize}
                onChange={(e) => setSmartEditorSize(+e.target.value)}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '11px', width: '30px' }}>{smartEditorSize}px</span>

              <div className="topbar-spacer" />

              <button
                className="topbar-btn danger"
                onClick={() => {
                  const canvas = smartEditorCanvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                  }
                }}
              >
                Clear Canvas
              </button>
            </div>

            {/* Canvas workspace area */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                background: 'var(--bg-darkest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                position: 'relative'
              }}
              className="canvas-checker"
            >
              <canvas
                ref={smartEditorCanvasRef}
                width={smartEditorWidth}
                height={smartEditorHeight}
                style={{
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  background: 'transparent',
                  cursor: smartEditorTool === 'eraser' ? 'cell' : 'crosshair',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                onPointerDown={handleSmartEditorPointerDown}
                onPointerMove={handleSmartEditorPointerMove}
                onPointerUp={handleSmartEditorPointerUp}
                onPointerCancel={handleSmartEditorPointerUp}
              />
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <button
                className="modal-btn secondary"
                onClick={() => setEditingSmartObjectId(null)}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={handleSaveSmartObjectEdit}
              >
                Save Smart Object
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
