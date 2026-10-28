import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/ui';
import { formatINR, formatINRCompact } from '@/lib/money';
import type { DisplayStatus } from '@/domain/types';
import { colors } from '@/styles/tokens';

const C = { navy: colors.navy[700], navyLight: colors.navy[600], teal: colors.teal[600], amber: colors.amber[600], red: colors.red[700], violet: colors.violet[700], slate: colors.chart.slate, slateLight: colors.chart.slateLight };
const STATUS_COLOR: Record<DisplayStatus, string> = {
  ACTIVE: C.teal, EXPIRING_SOON: C.amber, MATURED: C.red, RENEWAL_PENDING: C.violet, VERIFICATION_PENDING: C.navy, DISCREPANCY_FLAGGED: colors.red[900], REJECTED: C.slateLight, SUPERSEDED: colors.violet[400], RELEASED: C.slate,
};
const SERIES = [C.navy, C.teal, C.amber, C.red, C.violet, C.slate, C.navyLight];

export function StatusPie({ data }: { data: { status: DisplayStatus; label: string; count: number }[] }) {
  if (!data.length) return <EmptyState title="No instruments to chart" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={1}>
          {data.map((d) => <Cell key={d.status} fill={STATUS_COLOR[d.status]} />)}
        </Pie>
        <Tooltip formatter={(v: number, n: string) => [`${v} instrument${v === 1 ? '' : 's'}`, n]} />
        <Legend verticalAlign="bottom" height={48} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MaturityTimeline({ data }: { data: { label: string; count: number; valuePaise: number }[] }) {
  if (!data.some((d) => d.count)) return <EmptyState title="No maturities in the next 12 months" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -4, fontSize: 11 }} height={40} />
        <YAxis yAxisId="c" allowDecimals={false} tick={{ fontSize: 11 }} label={{ value: 'Instruments', angle: -90, position: 'insideLeft', fontSize: 11 }} />
        <YAxis yAxisId="v" orientation="right" tickFormatter={(v: number) => formatINRCompact(v)} tick={{ fontSize: 11 }} width={70} />
        <Tooltip formatter={(v: number, n: string) => (n === 'Value' ? [formatINR(v), n] : [v, n])} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="c" dataKey="count" name="Instruments" fill={C.navy} radius={[3, 3, 0, 0]} />
        <Line yAxisId="v" dataKey="valuePaise" name="Value" stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function WorkloadChart({ rows, series }: { rows: Record<string, string | number>[]; series: { key: string; label: string }[] }) {
  if (!series.length) return <EmptyState title="No open verification cases" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} label={{ value: 'Open cases', position: 'insideBottom', offset: -4, fontSize: 11 }} height={40} />
        <YAxis type="category" dataKey="officer" tick={{ fontSize: 11 }} width={100} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={SERIES[i % SERIES.length]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ValueByState({ data }: { data: { state: string; valuePaise: number; count: number }[] }) {
  if (!data.length) return <EmptyState title="No recorded deposits" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chart.grid} />
        <XAxis dataKey="state" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tickFormatter={(v: number) => formatINRCompact(v)} tick={{ fontSize: 11 }} width={70} label={{ value: 'Recorded value', angle: -90, position: 'insideLeft', fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [formatINR(v), 'Recorded value']} />
        <Bar dataKey="valuePaise" name="Recorded value" fill={C.teal} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
