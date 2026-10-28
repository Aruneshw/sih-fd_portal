import type { DocumentDraft } from '@/domain/schemas';
import type { AppState, DocumentMeta } from '@/domain/types';
import type { CommandContext } from './types';
import { nextId } from './helpers';

/** Persist document metadata (the blob itself already lives in IndexedDB under blobKey). */
export function addDocuments(
  state: AppState,
  drafts: DocumentDraft[],
  link: { fdrId?: string; requestId?: string },
  ctx: CommandContext,
): { state: AppState; ids: string[] } {
  let s = state;
  const ids: string[] = [];
  for (const d of drafts) {
    const n = nextId(s, 'DOC', 'DOC-', 6);
    s = n.state;
    const meta: DocumentMeta = {
      id: n.id,
      ...link,
      kind: d.kind,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sha256: d.sha256,
      blobKey: d.blobKey,
      isPlaceholder: d.isPlaceholder,
      uploadedBy: ctx.user.id,
      uploadedAt: ctx.now,
    };
    s = { ...s, documents: { ...s.documents, [meta.id]: JSON.parse(JSON.stringify(meta)) as DocumentMeta } };
    ids.push(n.id);
  }
  return { state: s, ids };
}
