import { Eye, FileText } from 'lucide-react';
import { useState } from 'react';
import { Badge, EmptyState, Modal } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { DOCUMENT_KIND_LABEL } from '@/domain/labels';
import type { DocumentMeta, Fdr } from '@/domain/types';
import { useUserName } from '../hooks/useViews';
import { DocumentPreview } from './DocumentPreview';

/** Documents are described as uploaded — never as authenticated or bank-verified (AC-M06-1). */
export function DocumentList({ docs, fdr }: { docs: DocumentMeta[]; fdr?: Fdr }) {
  const [open, setOpen] = useState<DocumentMeta | null>(null);
  const name = useUserName();
  if (!docs.length) return <EmptyState title="No documents attached" />;
  return (
    <>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <FileText size={18} className="text-slate-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                {d.fileName}
                <Badge>{DOCUMENT_KIND_LABEL[d.kind]}</Badge>
                {d.isPlaceholder && <Badge tone="amber">Sample placeholder</Badge>}
              </div>
              <div className="text-xs text-slate-500">
                {d.id} · uploaded by {name(d.uploadedBy)} · {formatDateTime(d.uploadedAt)} · {(d.sizeBytes / 1024).toFixed(0)} KB · SHA-256 {d.sha256.slice(0, 16)}… (integrity reference, not authentication)
              </div>
            </div>
            <button type="button" onClick={() => setOpen(d)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"><Eye size={14} aria-hidden /> Preview</button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.fileName ?? ''} size="xl" description={open ? DOCUMENT_KIND_LABEL[open.kind] : undefined}>
        {open && <DocumentPreview doc={open} fdr={fdr} />}
      </Modal>
    </>
  );
}
