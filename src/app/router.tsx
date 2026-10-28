import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui';
import type { ActionId } from '@/domain/permissions/actions';
import { LoginPage } from '@/features/auth';
import { RequirePermission } from './guards/RequirePermission';
import { RequireSession } from './guards/RequireSession';
import { RouteErrorBoundary } from './guards/RouteErrorBoundary';
import { AppShell } from './layout/AppShell';
import { ForbiddenPage, NotFoundPage } from './ForbiddenPage';
import { VERIFICATION_ACCESS } from './routes';

/** Lazy-load one feature page (architecture.md §16: routes are lazy-loaded per feature). */
function page<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }));
}

const Dashboard = page(() => import('@/features/dashboard'), 'DashboardPage');
const Institutions = page(() => import('@/features/institutions'), 'InstitutionsPage');
const InstitutionDetail = page(() => import('@/features/institutions'), 'InstitutionDetailPage');
const Registry = page(() => import('@/features/registry'), 'FdrRegistryPage');
const FdrDetail = page(() => import('@/features/registry'), 'FdrDetailPage');
const Wizard = page(() => import('@/features/submission'), 'SubmissionWizardPage');
const Queue = page(() => import('@/features/verification'), 'VerificationQueuePage');
const Workspace = page(() => import('@/features/verification'), 'VerificationWorkspacePage');
const Maturity = page(() => import('@/features/maturity'), 'MaturityPage');
const Requests = page(() => import('@/features/requests'), 'RequestsPage');
const NewRequest = page(() => import('@/features/requests'), 'NewRequestPage');
const RequestDetail = page(() => import('@/features/requests'), 'RequestDetailPage');
const Notifications = page(() => import('@/features/notifications'), 'NotificationsPage');
const Insights = page(() => import('@/features/insights'), 'InsightsPage');
const Reports = page(() => import('@/features/reports'), 'ReportsPage');
const ReportPrint = page(() => import('@/features/reports'), 'ReportPrintPage');
const Audit = page(() => import('@/features/audit'), 'AuditPage');
const Users = page(() => import('@/features/users'), 'UsersPage');
const SettingsPage = page(() => import('@/features/settings'), 'SettingsPage');

const guard = (anyOf: ActionId[], el: ReactNode) => <RequirePermission anyOf={anyOf}>{el}</RequirePermission>;

/** Hash-based data router: works on static hosting (GitHub Pages) and supports useBlocker (D-08). */
const router = createHashRouter(
  createRoutesFromElements(
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/reports/:reportId/print"
          element={
            <RequireSession>
              <RouteErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>{guard(['report.view'], <ReportPrint />)}</Suspense>
              </RouteErrorBoundary>
            </RequireSession>
          }
        />
        <Route element={<RequireSession><AppShell /></RequireSession>}>
          <Route index element={guard(['dashboard.view'], <Dashboard />)} />
          <Route path="institutions" element={guard(['institution.view'], <Institutions />)} />
          <Route path="institutions/:id" element={guard(['institution.view'], <InstitutionDetail />)} />
          <Route path="fdrs" element={guard(['fdr.view'], <Registry />)} />
          <Route path="fdrs/new" element={guard(['fdr.create'], <Wizard />)} />
          <Route path="fdrs/:id/renew" element={guard(['renewal.submit'], <Wizard />)} />
          <Route path="fdrs/:id" element={guard(['fdr.view'], <FdrDetail />)} />
          <Route path="verification" element={guard(VERIFICATION_ACCESS, <Queue />)} />
          <Route path="verification/:fdrId" element={guard(VERIFICATION_ACCESS, <Workspace />)} />
          <Route path="maturity" element={guard(['fdr.view'], <Maturity />)} />
          <Route path="requests" element={guard(['fdr.view'], <Requests />)} />
          <Route path="requests/new" element={guard(['request.submit'], <NewRequest />)} />
          <Route path="requests/:id" element={guard(['fdr.view'], <RequestDetail />)} />
          <Route path="notifications" element={guard(['notification.view'], <Notifications />)} />
          <Route path="insights" element={guard(['insights.view'], <Insights />)} />
          <Route path="reports" element={guard(['report.view'], <Reports />)} />
          <Route path="audit" element={guard(['audit.view'], <Audit />)} />
          <Route path="users" element={guard(['dashboard.view'], <Users />)} />
          <Route path="settings" element={guard(['settings.manage'], <SettingsPage />)} />
          <Route path="403" element={<ForbiddenPage missing={['(not specified)']} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </>,
  ),
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
