import React, { memo } from 'react';
import {
  Brush,
  Pencil,
  Eraser,
  Minus,
  Square,
  Circle,
  Type,
  Droplets,
  Pipette,
  Sparkles,
  Infinity as InfinityIcon,
  Paintbrush,
  Triangle,
  Star,
} from 'lucide-react';
import type { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'brush', icon: <Brush />, label: 'Brush (B)' },
  { id: 'pencil', icon: <Pencil />, label: 'Pencil (P)' },
  { id: 'eraser', icon: <Eraser />, label: 'Eraser (E)' },
  { id: 'line', icon: <Minus />, label: 'Line (L)' },
  { id: 'rectangle', icon: <Square />, label: 'Rectangle (R)' },
  { id: 'circle', icon: <Circle />, label: 'Circle (C)' },
  { id: 'triangle', icon: <Triangle />, label: 'Triangle' },
  { id: 'star', icon: <Star />, label: 'Star' },
  { id: 'text', icon: <Type />, label: 'Text (T)' },
  { id: 'bucket', icon: <Droplets />, label: 'Fill Bucket (G)' },
  { id: 'picker', icon: <Pipette />, label: 'Color Picker (I)' },
  { id: 'spray', icon: <Sparkles />, label: 'Spray Can' },
  { id: 'symmetry', icon: <InfinityIcon />, label: 'Symmetry Brush' },
  { id: 'gradient', icon: <Paintbrush />, label: 'Linear Gradient' },
];

const SEPARATOR_BEFORE = new Set([3, 8, 11]);

const Toolbar: React.FC<ToolbarProps> = memo(({ tool, onToolChange }) => (
  <div className="app-toolbar">
    {TOOLS.map((t, i) => (
      <React.Fragment key={t.id}>
        {SEPARATOR_BEFORE.has(i) && <div className="tool-sep" />}
        <button
          className={`tool-btn${tool === t.id ? ' active' : ''}`}
          onClick={() => onToolChange(t.id)}
        >
          {t.icon}
          <span className="tool-tooltip">{t.label}</span>
        </button>
      </React.Fragment>
    ))}
  </div>
));

Toolbar.displayName = 'Toolbar';
export default Toolbar;
