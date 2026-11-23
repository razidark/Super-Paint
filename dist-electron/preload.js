import { contextBridge as e, ipcRenderer as t } from "electron";
//#region src/preload.ts
e.exposeInMainWorld("electronAPI", {
	saveImage: () => t.send("save-image"),
	saveCanvasData: (e) => t.send("save-canvas-data", e),
	printImage: () => t.send("print-image"),
	scanImage: () => t.invoke("scan-image"),
	onSaveSuccess: (e) => t.on("save-success", (t, n) => e(n))
});
//#endregion
export {};
