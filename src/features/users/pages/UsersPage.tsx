import { Check, Minus } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader } from '@/components/ui';
import { ROLE_LABEL } from '@/domain/labels';
import { ACTIONS } from '@/domain/permissions/actions';
import { MATRIX } from '@/domain/permissions/matrix';
import { can } from '@/domain/permissions/can';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import { ROLES } from '@/domain/types';
import { useAppState, useCommand, useUser } from '@/app/hooks';

const SCOPE_LABEL = { all: 'All', own: 'Own institution', assigned: 'Assigned', ownActions: 'Own actions' } as const;

/** M13 — the matrix view is generated from the same data the guards use (FR-M13-2). */
export function UsersPage() {
  const state = useAppState();
  const me = useUser();
  const { run } = useCommand();
  const manage = can(me, 'user.manage').allowed;
  const load = (id: string) => Object.values(state.fdrs).filter((f) => f.assignedOfficerId === id && OPEN_VERIFICATION.includes(f.verificationStatus)).length;
  return (
    <div className="space-y-4">
      <PageHeader title="Users & access" description={manage ? 'Activate or deactivate demo users and set officer assignment caps. Changes are audited.' : 'Read-only view of demo users and the permission matrix.'} />
      <Card>
        <CardHeader title="Demo users" subtitle="Fictional accounts — demonstration authentication, not for production use." />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">{['User', 'Role', 'Scope', 'Status', 'Open cases / cap', ''].map((h) => <th key={h} scope="col" className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {Object.values(state.users).map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-2"><span className="block font-medium">{u.name}</span><span className="text-xs text-slate-500">{u.id} · {u.title}</span></td>
                  <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-2 text-xs">{u.institutionId ? `${state.institutions[u.institutionId]?.name ?? ''} (${u.institutionId})` : u.role === 'VERIFICATION_OFFICER' ? 'Read all, act on assigned' : u.role === 'AUDITOR' ? 'All, read-only' : 'All institutions'}</td>
                  <td className="px-4 py-2"><Badge tone={u.active ? 'teal' : 'slate'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-2">
                    {u.role === 'VERIFICATION_OFFICER' ? (
                      <span className="flex items-center gap-2">
                        {load(u.id)} /
                        {manage ? <Input aria-label={`Assignment cap for ${u.name}`} type="number" min={1} max={100} defaultValue={u.maxAssignedCases} className="!h-8 !w-20" onBlur={(e) => { const n = Number(e.target.value); if (n && n !== u.maxAssignedCases) run({ type: 'user.manage', payload: { userId: u.id, maxAssignedCases: n } }, { success: `Cap for ${u.name} set to ${n}.` }); }} /> : u.maxAssignedCases}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">{manage && u.id !== me.id && <Button size="sm" onClick={() => run({ type: 'user.manage', payload: { userId: u.id, active: !u.active } }, { success: `${u.name} ${u.active ? 'deactivated' : 'activated'}.` })}>{u.active ? 'Deactivate' : 'Activate'}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader title="Permission matrix" subtitle="Generated from the same permission data used by navigation, buttons and the command pipeline." />
        <CardBody className="!p-0">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead><tr>{['Action', ...ROLES.map((r) => ROLE_LABEL[r])].map((h) => <th key={h} scope="col" className="sticky top-0 border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a} className="border-b border-slate-100">
                    <th scope="row" className="px-3 py-1.5 font-mono font-normal">{a}</th>
                    {ROLES.map((r) => { const s = MATRIX[a][r]; return <td key={r} className="px-3 py-1.5">{s ? <span className="inline-flex items-center gap-1 text-teal-700"><Check size={12} aria-hidden />{SCOPE_LABEL[s]}</span> : <span className="inline-flex items-center gap-1 text-slate-400"><Minus size={12} aria-hidden /><span className="sr-only">Not permitted</span></span>}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
