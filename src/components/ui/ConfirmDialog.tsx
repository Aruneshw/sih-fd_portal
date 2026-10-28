import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

/** Every consequential action summarises what will change before it runs (architecture.md §17). */
export function ConfirmDialog({
  open, onClose, onConfirm, title, summary, confirmLabel = 'Confirm', tone = 'primary', pending, children, confirmDisabled, notice,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; summary: ReactNode; confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success'; pending?: boolean; children?: ReactNode; confirmDisabled?: boolean; notice?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} loading={pending} disabled={confirmDisabled}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <div>{summary}</div>
        {notice && <div className="rounded-md border border-amber-600/30 bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</div>}
        {children}
      </div>
    </Modal>
  );
}
