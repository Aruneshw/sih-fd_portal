import { useState } from 'react';
import { Button, Field, Modal, Textarea } from '@/components/ui';
import type { DocumentDraft } from '@/domain/schemas';
import type { DocumentKind, Fdr } from '@/domain/types';
import { useCommand } from '@/app/hooks';
import { DocumentUploader } from '@/features/shared';

/** Upload extra documents (document.upload) or respond to an information request (verification.respond). */
export function DocumentActionModal({ fdr, mode, open, onClose, kinds }: { fdr: Fdr; mode: 'upload' | 'respond'; open: boolean; onClose: () => void; kinds: DocumentKind[] }) {
  const { run, pending } = useCommand();
  const [docs, setDocs] = useState<DocumentDraft[]>([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const r = mode === 'upload'
      ? run({ type: 'document.upload', payload: { fdrId: fdr.id, documents: docs } }, { success: 'Documents attached.' })
      : run({ type: 'verification.respond', payload: { fdrId: fdr.id, note, documents: docs }, expectedVersion: fdr.version }, { success: 'Response sent to the verification officer.' });
    if (r.ok) { setDocs([]); setNote(''); onClose(); } else setErrors(r.error.fieldErrors ?? {});
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" title={mode === 'upload' ? `Attach documents to ${fdr.id}` : `Respond to information request — ${fdr.id}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={pending} onClick={submit} disabled={mode === 'upload' ? !docs.length : !docs.length && !note.trim()}>{mode === 'upload' ? 'Attach' : 'Send response'}</Button></>}>
      <div className="space-y-4">
        {mode === 'respond' && (
          <Field label="Response note" error={errors.note} hint="Add a note, attach documents, or both.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </Field>
        )}
        <DocumentUploader drafts={docs} onChange={setDocs} kinds={kinds} error={errors.documents} />
      </div>
    </Modal>
  );
}
