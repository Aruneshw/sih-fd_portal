import clsx from 'clsx';
import { CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination, PriorityBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { ESCALATION_LABEL, NOTIFICATION_CATEGORY_LABEL, PRIORITY_LABEL } from '@/domain/labels';
import { scopedNotifications } from '@/domain/selectors/scope';
import type { Notification, NotificationCategory, Priority } from '@/domain/types';
import { useAppState, useCommand, useUser } from '@/app/hooks';
import { useUrlState } from '@/features/shared';

/** M10 — notifications are derived from data with de-duplication keys; read state is per user. */
export function NotificationsPage() {
  const state = useAppState();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const { run } = useCommand();
  const all = scopedNotifications(state, user);
  const read = (n: Notification) => !!n.readBy[user.id];
  const showResolved = url.get('resolved') === '1';
  const rows = all.filter((n) =>
    (showResolved || !n.resolvedAt) &&
    (!url.get('category') || n.category === url.get('category')) &&
    (!url.get('priority') || n.priority === url.get('priority')) &&
    (!url.get('read') || (url.get('read') === 'unread' ? !read(n) : read(n))),
  );
  const unread = rows.filter((n) => !read(n));
  const page = rows.slice((url.page - 1) * url.pageSize, url.page * url.pageSize);
  const open = (n: Notification) => {
    if (!read(n)) run({ type: 'notification.markRead', payload: { ids: [n.id] } }, { toastValidation: false });
    nav(n.link);
  };
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Generated from current data on load and every 5 minutes, with de-duplication so refreshes never create duplicates."
        actions={<Button icon={<CheckCheck size={16} aria-hidden />} disabled={!unread.length} onClick={() => run({ type: 'notification.markRead', payload: { ids: unread.map((n) => n.id) } }, { success: `${unread.length} marked as read.` })}>Mark all as read</Button>}
      />
      <Card>
        <FilterBar hasFilters={['category', 'priority', 'read', 'resolved'].some((k) => url.get(k))} onClear={() => url.clear()}>
          <FilterSelect label="Category" value={url.get('category')} onChange={(v) => url.set({ category: v })} options={(Object.keys(NOTIFICATION_CATEGORY_LABEL) as NotificationCategory[]).map((c) => ({ value: c, label: NOTIFICATION_CATEGORY_LABEL[c] }))} />
          <FilterSelect label="Priority" value={url.get('priority')} onChange={(v) => url.set({ priority: v })} options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
          <FilterSelect label="Read state" value={url.get('read')} onChange={(v) => url.set({ read: v })} options={[{ value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }]} />
          <label className="flex items-center gap-2 self-center text-xs font-medium text-slate-700"><input type="checkbox" checked={showResolved} onChange={(e) => url.set({ resolved: e.target.checked ? '1' : null })} className="h-4 w-4 rounded border-slate-300" /> Include resolved</label>
        </FilterBar>
        {!rows.length ? <EmptyState title="No notifications match" /> : (
          <ul className="divide-y divide-slate-100">
            {page.map((n) => (
              <li key={n.id} className={clsx('flex flex-wrap items-start gap-3 px-4 py-3', !read(n) && !n.resolvedAt && 'bg-navy-50/60')}>
                <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', read(n) || n.resolvedAt ? 'bg-transparent' : 'bg-teal-600')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('text-sm', read(n) ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.title}</span>
                    <PriorityBadge priority={n.priority} />
                    <Badge>{NOTIFICATION_CATEGORY_LABEL[n.category]}</Badge>
                    {n.escalationStage !== 'INITIAL' && <Badge tone={n.escalationStage === 'ESCALATED' ? 'red' : 'amber'}>{ESCALATION_LABEL[n.escalationStage]}</Badge>}
                    {n.resolvedAt && <Badge tone="slate">Resolved {formatDateTime(n.resolvedAt)}</Badge>}
                    {!read(n) && <span className="sr-only">Unread</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(n.createdAt)}{n.institutionId ? ` · ${state.institutions[n.institutionId]?.name ?? n.institutionId}` : ''}{n.fdrId ? ` · ${n.fdrId}` : ''}{n.requestId ? ` · ${n.requestId}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  {!read(n) && <Button size="sm" variant="ghost" onClick={() => run({ type: 'notification.markRead', payload: { ids: [n.id] } }, { toastValidation: false })}>Mark as read</Button>}
                  <Button size="sm" icon={<ExternalLink size={14} aria-hidden />} onClick={() => open(n)}>Open</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && <Pagination page={url.page} pageSize={url.pageSize} total={rows.length} onPage={(p) => url.set({ page: p }, { resetPage: false })} onPageSize={(s) => url.set({ size: s })} />}
      </Card>
      <p className="mt-3 text-xs text-slate-500">In this prototype notifications are delivered in-app only. Production delivery needs a server-side scheduler and authorised email/SMS gateways. Escalation: initial reminder → follow-up after {state.settings.escalation.followUpAfterDays} days → escalation to the designated supervisor after {state.settings.escalation.escalateAfterDays} days.</p>
    </div>
  );
}
