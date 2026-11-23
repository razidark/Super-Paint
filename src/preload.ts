import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    saveImage: () => ipcRenderer.send('save-image'),
    saveCanvasData: (data: string) => ipcRenderer.send('save-canvas-data', data),
    printImage: () => ipcRenderer.send('print-image'),
    scanImage: () => ipcRenderer.invoke('scan-image'),
    onSaveSuccess: (callback: (success: boolean) => void) =>
        ipcRenderer.on('save-success', (_event, success) => callback(success)),
})

