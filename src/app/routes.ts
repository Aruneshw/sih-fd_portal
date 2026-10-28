import {
  Bell, BookOpenCheck, Building2, CalendarClock, FileBarChart, FileStack, LayoutDashboard, Lightbulb, ScrollText, Send, Settings, Users,
  type LucideIcon,
} from 'lucide-react';
import { REVIEW_ACTIONS, type ActionId } from '@/domain/permissions/actions';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  anyOf: ActionId[];
}

export const VERIFICATION_ACCESS: ActionId[] = [...REVIEW_ACTIONS, 'verification.assign'];

/** Sidebar sections — items are hidden when the role lacks every listed permission (FR-M02-1). */
export const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, anyOf: ['dashboard.view'] },
    { to: '/insights', label: 'Intelligence & Insights', icon: Lightbulb, anyOf: ['insights.view'] },
  ] },
  { section: 'Registry', items: [
    { to: '/institutions', label: 'Institutions', icon: Building2, anyOf: ['institution.view'] },
    { to: '/fdrs', label: 'FDR registry', icon: FileStack, anyOf: ['fdr.view'] },
    { to: '/maturity', label: 'Maturity & renewals', icon: CalendarClock, anyOf: ['fdr.view'] },
  ] },
  { section: 'Workflows', items: [
    { to: '/verification', label: 'Verification centre', icon: BookOpenCheck, anyOf: VERIFICATION_ACCESS },
    { to: '/requests', label: 'Release & refund', icon: Send, anyOf: ['fdr.view'] },
    { to: '/notifications', label: 'Notifications', icon: Bell, anyOf: ['notification.view'] },
  ] },
  { section: 'Oversight', items: [
    { to: '/reports', label: 'Reports', icon: FileBarChart, anyOf: ['report.view'] },
    { to: '/audit', label: 'Audit trail', icon: ScrollText, anyOf: ['audit.view'] },
    { to: '/users', label: 'Users & access', icon: Users, anyOf: ['dashboard.view'] },
    { to: '/settings', label: 'Settings', icon: Settings, anyOf: ['settings.manage'] },
  ] },
];
