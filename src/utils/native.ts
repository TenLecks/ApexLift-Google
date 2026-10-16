// Thin access to native Capacitor plugins through the APK's native bridge.
// The web code does not import @capacitor/*: these calls are no-ops in a normal browser
// and in older APKs that lack a plugin.

interface NativeBridge {
  nativePromise(plugin: string, method: string, options?: object): Promise<unknown>;
  addListener?(plugin: string, event: string, cb: (data: unknown) => void): { remove(): Promise<void> | void };
}

function bridge(): NativeBridge | null {
  const c = (globalThis as { Capacitor?: Partial<NativeBridge> }).Capacitor;
  return c && typeof c.nativePromise === 'function' ? (c as NativeBridge) : null;
}

export const isNativeApp = () => bridge() !== null;

export async function callNative<T = unknown>(plugin: string, method: string, options: object = {}): Promise<T | null> {
  const b = bridge();
  if (!b) return null;
  try {
    return (await b.nativePromise(plugin, method, options)) as T;
  } catch (e) {
    console.warn(`[native] ${plugin}.${method} failed`, e);
    return null;
  }
}

export function addNativeListener(plugin: string, event: string, cb: (data: unknown) => void): () => void {
  const b = bridge();
  if (!b?.addListener) return () => undefined;
  const handle = b.addListener(plugin, event, cb);
  return () => void handle.remove();
}
