export {};

declare global {
  interface Window {
    electronAPI: {
      saveImage: () => void;
      saveCanvasData: (data: string) => void;
      printImage: () => void;
      scanImage: () => Promise<string | { error: string }>;
      onSaveSuccess: (callback: (success: boolean) => void) => void;
    };

  }
}
