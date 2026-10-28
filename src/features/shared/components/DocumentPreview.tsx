import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { DOCUMENT_KIND_LABEL } from '@/domain/labels';
import type { DocumentMeta, Fdr } from '@/domain/types';
import { loadDocumentBlob } from '@/services/documents/intake';
import { useAppState } from '@/app/hooks';

/** FR-M07-3: real uploads render from IndexedDB; seed documents show a generated, labelled placeholder. */
export function DocumentPreview({ doc, fdr }: { doc: DocumentMeta; fdr?: Fdr }) {
  const state = useAppState();
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let revoke: string | null = null;
    setUrl(null);
    setMissing(false);
    if (doc.isPlaceholder) return;
    loadDocumentBlob(doc).then((b) => {
      if (!b) { setMissing(true); return; }
      revoke = URL.createObjectURL(b);
      setUrl(revoke);
    }).catch(() => setMissing(true));
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [doc]);

  if (doc.isPlaceholder) {
    const inst = fdr ? state.institutions[fdr.institutionId] : undefined;
    const bank = fdr ? state.banks[fdr.bankId] : undefined;
    return (
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5">
        <div className="absolute right-3 top-3 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Sample placeholder</div>
        <div className="mb-3 flex items-center gap-2 text-slate-500"><FileText size={18} aria-hidden /> {DOCUMENT_KIND_LABEL[doc.kind]}</div>
        {fdr && doc.kind === 'FDR_SCAN' ? (
          <div className="mx-auto max-w-sm rounded-md border border-slate-300 bg-white p-4 font-mono text-xs text-slate-700 shadow-sm">
            <div className="mb-2 text-center text-sm font-semibold">{bank?.name ?? fdr.bankId}</div>
            <div className="mb-3 text-center text-[11px] text-slate-500">{fdr.branch} branch · Fixed Deposit Receipt (illustrative)</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt>Reference</dt><dd>{fdr.referenceNo}</dd>
              <dt>In favour of</dt><dd>{inst?.name ?? fdr.institutionId}</dd>
              <dt>Inst. code</dt><dd>{fdr.declaredInstitutionCode}</dd>
              <dt>Amount</dt><dd>{state.extracted[fdr.id]?.values.amountPaise ? formatINR(Number(state.extracted[fdr.id].values.amountPaise)) : formatINR(fdr.amountPaise)}</dd>
              <dt>Issued</dt><dd>{formatDate(fdr.issueDate)}</dd>
              <dt>Matures</dt><dd>{formatDate(fdr.maturityDate)}</dd>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Generated placeholder for a seeded document. No file content is stored for demonstration records.</p>
        )}
        <p className="mt-3 text-[11px] text-slate-500">{doc.fileName} · uploaded {formatDateTime(doc.uploadedAt)}. This image is generated for the demonstration and is not a real instrument.</p>
      </div>
    );
  }
  if (missing) return <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">The file is not available in this browser (it may have been uploaded on another device or the browser storage was cleared). Metadata and SHA-256 reference are retained.</p>;
  if (!url) return <p className="p-4 text-sm text-slate-500">Loading preview…</p>;
  return doc.mimeType === 'application/pdf'
    ? <iframe title={`Preview of ${doc.fileName}`} src={url} className="h-[60vh] w-full rounded-md border border-slate-200" />
    : <img src={url} alt={`Uploaded document ${doc.fileName}`} className="max-h-[60vh] w-full rounded-md border border-slate-200 object-contain" />;
}
