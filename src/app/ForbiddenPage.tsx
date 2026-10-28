import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '@/domain/labels';
import { useUser } from './hooks';

export function ForbiddenPage({ missing }: { missing: string[] }) {
  const user = useUser();
  return (
    <div className="mx-auto max-w-lg p-6 text-center">
      <ShieldOff size={36} className="mx-auto text-red-700" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-navy-900">403 — Access not permitted</h1>
      <p className="mt-2 text-sm text-slate-600">
        {ROLE_LABEL[user.role]} does not have the <code className="rounded bg-slate-100 px-1">{missing.join(' / ')}</code> permission required for this page.
        The attempt has been recorded in the audit trail.
      </p>
      <Link to="/" className="mt-4 inline-block rounded-md bg-navy-700 px-3 py-2 text-sm text-white">Go to dashboard</Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg p-6 text-center">
      <h1 className="text-xl font-semibold text-navy-900">404 — Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you requested does not exist in this prototype.</p>
      <Link to="/" className="mt-4 inline-block rounded-md bg-navy-700 px-3 py-2 text-sm text-white">Go to dashboard</Link>
    </div>
  );
}
