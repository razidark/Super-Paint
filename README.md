# Super Paint

> A layer-based raster painting app built with React and the Canvas 2D API.
> Brushes, layers, filters, transforms, rulers, undo/redo — no bloat.

---

## Features

- **Brushes** — size, opacity, hardness, colour, pressure support
- **Layers** — add, delete, reorder, blend modes, opacity, visibility
- **Filters** — brightness, contrast, blur, grayscale, sepia, invert
- **Transform** — move, scale, rotate, flip per layer
- **Shapes and text** — geometric tools plus a text tool
- **Selection tools** — marquee-style selection with transform handles
- **Undo / redo** — 50-step history
- **Rulers and guides** — draggable guides with live cursor tracking
- **Keyboard shortcuts** — full set (see `src/hooks/useKeyboardShortcuts.ts`)

## Tech stack

| | |
|---|---|
| UI | React 19 + TypeScript |
| Rendering | Canvas 2D API (no WebGL) |
| Build | Vite + `tsc -b` |
| Icons | lucide-react |

## Requirements

- Node.js 20+
- npm

## Getting started

```bash
npm install
npm run dev      # -> http://127.0.0.1:5179
```

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | type-check then build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | serve the production build |

## Project layout

```
src/
  components/
    Canvas.tsx            the drawing surface and all interaction
    BrushPanel.tsx        brush settings
    ColorPanel.tsx        colour picker
    LayersPanel.tsx       layer list and properties
    FiltersPanel.tsx      image filters
    PropertiesPanel.tsx   object properties
    TransformPanel.tsx    transform controls
    Toolbar.tsx           tool palette
    TopBar.tsx            file / export actions
    canvas/               drawing engine, shape tools, flood fill, filters
  hooks/
    useHistory.ts         undo / redo stack
    useKeyboardShortcuts.ts
  constants.ts            canvas size, history depth, filter definitions
  types.ts
```

## Notes

Colours for the rulers and accent outlines are resolved from the active CSS
theme via `getComputedStyle` — a CSS variable is not a valid canvas colour, so
assigning `ctx.fillStyle = 'var(--x)'` is silently ignored by the canvas API.

Undo restores the full layer set and clears any layer that was deleted in a
later state, so a deleted layer never lingers as a ghost on the canvas.

## Credits

Built by **RZL Apps**.
