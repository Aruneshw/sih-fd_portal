import { Modal } from '@/components/ui';

/** prd.md §11 — what the prototype simulates vs production. */
export const SIMULATED_ROWS: [string, string, string][] = [
  ['Authentication', 'Demo user picker', 'Institutional SSO / government identity provider, MFA, server sessions'],
  ['Authorisation', 'Client-side guards + command checks', 'Server-side policy enforcement on every API call'],
  ['Persistence', 'localStorage + IndexedDB', 'Relational database with backups, point-in-time recovery'],
  ['Documents', 'Browser IndexedDB, SHA-256 reference', 'Encrypted object storage, malware scanning, retention policy'],
  ['Bank confirmation', 'Officer records method + evidence', 'Authorised bank interface or approved confirmation process'],
  ['OCR', 'Manual “values as read” entry', 'Approved OCR service behind the same port'],
  ['Notifications', 'In-app, generated on load/interval', 'Server scheduler + authorised email/SMS gateways'],
  ['Audit', 'Client hash chain', 'Server-side append-only/WORM store, restricted access, integrity protection'],
  ['Hosting', 'Static demo build', 'Government-approved cloud, TLS, WAF, rate limiting, monitoring'],
  ['Compliance', 'Not reviewed', 'Security audit, data protection review, AICTE process sign-off'],
];

export function WhatIsSimulatedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="xl" title="What is simulated in this prototype" description="Every workflow works end-to-end against demonstration data. Nothing here connects to a bank, moves money or represents AICTE.">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-600">
              <th scope="col" className="py-2 pr-3">Capability</th>
              <th scope="col" className="py-2 pr-3">Prototype</th>
              <th scope="col" className="py-2">Production requirement</th>
            </tr>
          </thead>
          <tbody>
            {SIMULATED_ROWS.map(([c, p, r]) => (
              <tr key={c} className="border-b border-slate-100 align-top">
                <th scope="row" className="py-2 pr-3 font-medium text-slate-900">{c}</th>
                <td className="py-2 pr-3 text-slate-700">{p}</td>
                <td className="py-2 text-slate-700">{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li>“Verified” always means recorded as verified by a named officer, with method and evidence — never a bank check by this system.</li>
        <li>Rule-engine output is a potential issue for human review, not a conclusion.</li>
        <li>Release and refund approvals are simulated administrative decisions; no funds are moved.</li>
      </ul>
    </Modal>
  );
}
