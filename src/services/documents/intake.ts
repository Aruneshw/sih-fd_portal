import { checkFile } from '@/lib/file';
import { sha256Hex } from '@/lib/hash';
import { BlobStore } from '@/data/storage/BlobStore';
import type { DocumentDraft } from '@/domain/schemas';
import type { DocumentKind, DocumentMeta, Settings } from '@/domain/types';

export type IntakeResult = { ok: true; draft: DocumentDraft } | { ok: false; message: string };

/**
 * Validate a browser File (extension, MIME, signature, size — FR-M06-3),
 * hash it and store the blob in IndexedDB. Rejected files are never stored.
 * The SHA-256 is an integrity reference, not authentication.
 */
export async function intakeFile(file: File, kind: DocumentKind, settings: Settings): Promise<IntakeResult> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const check = checkFile({ name: file.name, type: file.type, size: file.size, head }, settings.upload);
  if (!check.ok) return { ok: false, message: check.message };
  const sha256 = await sha256Hex(await file.arrayBuffer());
  const blobKey = `sha256-${sha256}`; // content-addressed, no random IDs
  try {
    await BlobStore.put(blobKey, file);
  } catch {
    return { ok: false, message: 'The file could not be stored in this browser (IndexedDB unavailable or full).' };
  }
  return {
    ok: true,
    draft: { kind, fileName: file.name.slice(0, 200), mimeType: check.mime as DocumentDraft['mimeType'], sizeBytes: file.size, sha256, blobKey, isPlaceholder: false },
  };
}

export async function discardDrafts(drafts: DocumentDraft[], keep: (blobKey: string) => boolean = () => false): Promise<void> {
  for (const d of drafts) if (d.blobKey && !keep(d.blobKey)) await BlobStore.remove(d.blobKey).catch(() => undefined);
}

export async function loadDocumentBlob(doc: DocumentMeta): Promise<Blob | undefined> {
  if (!doc.blobKey) return undefined;
  return BlobStore.get(doc.blobKey);
}
