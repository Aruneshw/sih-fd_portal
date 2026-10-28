import { FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FileDropzone, Select, useToast } from '@/components/ui';
import { DOCUMENT_KIND_LABEL } from '@/domain/labels';
import type { DocumentDraft } from '@/domain/schemas';
import type { DocumentKind } from '@/domain/types';
import { intakeFile } from '@/services/documents/intake';
import { useAppState } from '@/app/hooks';

/** Picks, checks (type/size/signature) and stores files; returns drafts for a command payload. */
export function DocumentUploader({ drafts, onChange, kinds, defaultKind, error }: { drafts: DocumentDraft[]; onChange: (d: DocumentDraft[]) => void; kinds: DocumentKind[]; defaultKind?: DocumentKind; error?: string }) {
  const state = useAppState();
  const toast = useToast();
  const [kind, setKind] = useState<DocumentKind>(defaultKind ?? kinds[0]);
  const [busy, setBusy] = useState(false);
  const [rejections, setRejections] = useState<string[]>([]);
  const maxMb = (state.settings.upload.maxBytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '');

  const onFiles = async (files: File[]) => {
    setBusy(true);
    const added: DocumentDraft[] = [];
    const rejected: string[] = [];
    for (const f of files) {
      const r = await intakeFile(f, kind, state.settings);
      if (r.ok) added.push(r.draft);
      else rejected.push(r.message);
    }
    setBusy(false);
    setRejections(rejected);
    if (rejected.length) toast.error(rejected[0]);
    if (added.length) onChange([...drafts, ...added]);
  };

  return (
    <div className="space-y-2">
      {kinds.length > 1 && (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
          Document type
          <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {kinds.map((k) => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}
          </Select>
        </label>
      )}
      <FileDropzone onFiles={onFiles} multiple disabled={busy} label={busy ? 'Checking files…' : `Choose ${DOCUMENT_KIND_LABEL[kind].toLowerCase()} file(s)`} hint={`PDF, JPG or PNG · up to ${maxMb} MB each · checked by type and file signature`} />
      {rejections.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-xs font-medium text-red-700">{rejections.map((r) => <li key={r}>{r}</li>)}</ul>
      )}
      {error && <p className="text-xs font-medium text-red-700" role="alert">{error}</p>}
      {drafts.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {drafts.map((d, i) => (
            <li key={`${d.sha256}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText size={16} className="text-slate-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-800">{d.fileName}</span>
                <span className="block text-xs text-slate-500">{DOCUMENT_KIND_LABEL[d.kind]} · {(d.sizeBytes / 1024).toFixed(0)} KB · SHA-256 {d.sha256.slice(0, 12)}… (integrity reference)</span>
              </span>
              <button type="button" aria-label={`Remove ${d.fileName}`} onClick={() => onChange(drafts.filter((_, j) => j !== i))} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
