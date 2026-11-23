import { useRef, useCallback } from 'react';
import type { CanvasHandle } from '../components/Canvas';
import type { LayerMetadata } from '../types';
import { MAX_HISTORY } from '../constants';

type HistoryEntry = {
  layers: LayerMetadata[];
  activeLayerId: string;
  images: { [layerId: string]: string };
};

export function useHistory(
  canvasRef: React.RefObject<CanvasHandle | null>,
  layers: LayerMetadata[],
  activeLayerId: string,
  setLayers: React.Dispatch<React.SetStateAction<LayerMetadata[]>>,
  setActiveLayerId: React.Dispatch<React.SetStateAction<string>>
) {
  const history = useRef<HistoryEntry[]>([]);
  const historyIdx = useRef(-1);

  // Layer ids that exist on the canvas right now. Tracked so an undo can
  // clear the layers that were deleted in a later state -- restoring only
  // the layers the snapshot contains left the deleted layer's canvas
  // behind as a ghost that was still painted on.
  const liveLayerIds = useRef<Set<string>>(new Set());

  const restoreEntry = useCallback(
    (entry: HistoryEntry) => {
      setLayers(entry.layers);
      setActiveLayerId(entry.activeLayerId);

      const snapshotIds = new Set(entry.layers.map((l) => l.id));

      // Clear every layer that is on the canvas but not in the snapshot.
      for (const id of liveLayerIds.current) {
        if (!snapshotIds.has(id)) {
          canvasRef.current?.clearLayer(id);
        }
      }

      // Then restore the snapshot's layers.
      for (const layer of entry.layers) {
        const dataUrl = entry.images[layer.id] ?? '';
        canvasRef.current?.setLayerData(layer.id, dataUrl);
      }

      liveLayerIds.current = snapshotIds;
    },
    [canvasRef, setLayers, setActiveLayerId]
  );

  const saveHistory = useCallback(
    (customLayers?: LayerMetadata[], customActiveLayerId?: string) => {
      // If history is empty, save the initial state before this action
      if (history.current.length === 0) {
        const initialImages: { [layerId: string]: string } = {};
        for (const l of layers) {
          initialImages[l.id] = canvasRef.current?.getLayerDataUrl(l.id) ?? '';
        }
        history.current.push({
          layers: [...layers],
          activeLayerId,
          images: initialImages,
        });
        historyIdx.current = 0;
      }

      const targetLayers = customLayers ?? layers;
      const targetActiveId = customActiveLayerId ?? activeLayerId;

      const images: { [layerId: string]: string } = {};
      for (const l of targetLayers) {
        images[l.id] = canvasRef.current?.getLayerDataUrl(l.id) ?? '';
      }

      const snapshot: HistoryEntry = {
        layers: targetLayers.map((l) => ({ ...l })),
        activeLayerId: targetActiveId,
        images,
      };

      liveLayerIds.current = new Set(targetLayers.map((l) => l.id));

      // Trim future entries on new action
      history.current = history.current.slice(0, historyIdx.current + 1);
      history.current.push(snapshot);

      // Cap history to prevent memory bloat
      if (history.current.length > MAX_HISTORY) {
        history.current = history.current.slice(history.current.length - MAX_HISTORY);
      }
      historyIdx.current = history.current.length - 1;
    },
    [layers, activeLayerId, canvasRef]
  );

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    restoreEntry(history.current[historyIdx.current]);
  }, [restoreEntry]);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    restoreEntry(history.current[historyIdx.current]);
  }, [restoreEntry]);

  const clearHistory = useCallback(() => {
    history.current = [];
    historyIdx.current = -1;
  }, []);

  return { saveHistory, undo, redo, clearHistory };
}
