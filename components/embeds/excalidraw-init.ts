// Excalidraw lazy loader to avoid SSR issues
let ExcalidrawComponent: any = null;
let loadPromise: Promise<any> | null = null;

export async function initializeExcalidraw() {
  if (ExcalidrawComponent) {
    return ExcalidrawComponent;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const { Excalidraw } = await import('@excalidraw/excalidraw');
    ExcalidrawComponent = Excalidraw;
    return Excalidraw;
  })();

  return loadPromise;
}
