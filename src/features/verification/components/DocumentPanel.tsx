import { FilePlus2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, EmptyState, Modal } from '@/components/ui';
import { DOCUMENT_KIND_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import type { DocumentDraft } from '@/domain/schemas';
import type { AppState, Fdr } from '@/domain/types';
import { useCommand, useUser } from '@/app/hooks';
import { DocumentPreview, DocumentUploader } from '@/features/shared';

export function DocumentPanel({ fdr, state }: { fdr: Fdr; state: AppState }) {
  const user = useUser();
  const { run, pending } = useCommand();
  const docs = fdr.documentIds.map((d) => state.documents[d]).filter(Boolean);
  const [active, setActive] = useState(docs[0]?.id ?? '');
  const [upload, setUpload] = useState(false);
  const [drafts, setDrafts] = useState<DocumentDraft[]>([]);
  const doc = state.documents[active] ?? docs[0];
  const canEvidence = user.role === 'VERIFICATION_OFFICER' && can(user, 'document.upload', { institutionId: fdr.institutionId, assignedOfficerId: fdr.assignedOfficerId }).allowed;
  return (
    <section aria-label="Document preview" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-navy-900">Documents</h2>
        {canEvidence && <Button size="sm" icon={<FilePlus2 size={14} aria-hidden />} onClick={() => setUpload(true)}>Upload evidence</Button>}
      </div>
      {docs.length === 0 ? <EmptyState title="No documents attached" /> : (
        <div className="p-3">
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Choose document">
            {docs.map((d) => (
              <button key={d.id} role="tab" aria-selected={d.id === doc?.id} type="button" onClick={() => setActive(d.id)} className={`rounded-md border px-2 py-1 text-xs ${d.id === doc?.id ? 'border-navy-600 bg-navy-50 text-navy-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {DOCUMENT_KIND_LABEL[d.kind]}{d.isPlaceholder && <Badge tone="amber" className="ml-1 !px-1 !py-0 !text-[10px]">sample</Badge>}
              </button>
            ))}
          </div>
          {doc && <DocumentPreview doc={doc} fdr={fdr} />}
        </div>
      )}
      <Modal open={upload} onClose={() => setUpload(false)} title="Upload verification evidence" footer={<><Button onClick={() => setUpload(false)}>Cancel</Button><Button variant="primary" loading={pending} disabled={!drafts.length} onClick={() => { const r = run({ type: 'document.upload', payload: { fdrId: fdr.id, documents: drafts } }, { success: 'Evidence attached.' }); if (r.ok) { setDrafts([]); setUpload(false); } }}>Attach</Button></>}>
        <DocumentUploader drafts={drafts} onChange={setDrafts} kinds={['VERIFICATION_EVIDENCE']} />
      </Modal>
    </section>
  );
}
