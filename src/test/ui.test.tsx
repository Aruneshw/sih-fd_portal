import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { validateDraft } from '@/features/submission/components/instrumentDraft';

describe('UI', () => {
  it('StatusBadge uses text, not colour alone', () => {
    render(<StatusBadge status="DISCREPANCY_FLAGGED" />);
    expect(screen.getByText('Discrepancy Flagged').closest('span')?.querySelector('svg')).not.toBeNull();
  });

  it('Tabs support arrow-key navigation', async () => {
    function T() {
      const [a, setA] = useState('one');
      return <Tabs tabs={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} active={a} onChange={setA}><p>panel {a}</p></Tabs>;
    }
    render(<T />);
    screen.getByRole('tab', { name: 'One' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('panel two')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('aria-selected')).toBe('true');
  });

  it('submission wizard validation blocks bad dates and empty fields', () => {
    const base = { referenceNo: 'X/1', bankId: 'BNK-01', branch: 'A', amountPaise: 100, issueDate: '2026-10-01', maturityDate: '2026-09-01', category: 'CONTINUATION' as const, declaredInstitutionCode: 'DEMO-1', remarks: '' };
    const r = validateDraft(base, '2026-10-28', 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.maturityDate).toMatch(/after the issue date/);
    const e = validateDraft({ ...base, branch: '', amountPaise: null, maturityDate: '2027-01-01' }, '2026-10-28', 10_000);
    expect(!e.ok && e.errors.branch && e.errors.amountPaise).toBeTruthy();
    expect(validateDraft({ ...base, maturityDate: '2027-01-01' }, '2026-10-28', 10_000).ok).toBe(true);
  });
});
