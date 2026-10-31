// Tiny lazy-loader for UI components
/**
 * Reads sdk-manifest.json from the public /sdk/ folder and dynamically imports the requested component chunk.
 * Falls back to loading a full UI bundle if the manifest or chunk cannot be fetched.
 */
export async function loadComponent(name: string): Promise<any> {
  if (typeof window === 'undefined') {
    return null;
  }
  const origin = window.location.origin || '';
  const manifestUrl = `${origin}/sdk/sdk-manifest.json`;
  try {
    const resp = await fetch(manifestUrl);
    if (!resp.ok) throw new Error('Manifest fetch failed');
    const manifest: Record<string, string> = await resp.json();
    const chunkFile = manifest[name];
    if (!chunkFile) throw new Error(`Component ${name} not found in manifest`);
    const moduleUrl = `${origin}/sdk/${chunkFile}`;
    const mod = await import(/* webpackIgnore: true */ moduleUrl);
    return mod.default ?? mod;
  } catch {
    // fallback: load full bundle if in browser environment
    try {
      const fallbackUrl = `${origin}/sdk/full-ui.bundle.js`;
      const fallbackMod = await import(/* webpackIgnore: true */ fallbackUrl);
      return fallbackMod?.[name] ?? null;
    } catch {
      return null;
    }
  }
}
