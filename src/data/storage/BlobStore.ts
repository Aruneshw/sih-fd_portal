import { createStore, del, get, set } from 'idb-keyval';

/** Uploaded file contents live in IndexedDB so localStorage stays small (architecture.md §10). */
const store = typeof indexedDB !== 'undefined' ? createStore('securefdr-blobs', 'blobs') : undefined;

export const BlobStore = {
  available: () => !!store,
  async put(key: string, blob: Blob): Promise<void> {
    if (!store) throw new Error('Browser file storage (IndexedDB) is not available.');
    await set(key, blob, store);
  },
  async get(key: string): Promise<Blob | undefined> {
    if (!store) return undefined;
    return (await get(key, store)) as Blob | undefined;
  },
  async remove(key: string): Promise<void> {
    if (store) await del(key, store);
  },
};
