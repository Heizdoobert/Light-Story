/**
 * Minimal in-memory stand-in for a KVNamespace.
 *
 * Lives outside any *.test.ts file on purpose: importing a helper from a test
 * module re-registers that module's describe blocks in every importer, which
 * double-counts its tests.
 */
export function fakeKV(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => {
      const raw = store.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async ({ prefix }: { prefix?: string; cursor?: string } = {}) => {
      const names = [...store.keys()].filter((k) => !prefix || k.startsWith(prefix));
      return { keys: names.map((name) => ({ name })), list_complete: true, cursor: undefined };
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}
