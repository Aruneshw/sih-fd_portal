import { AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, PageSkeleton, useToast } from '@/components/ui';
import { downloadText } from '@/services/export/download';
import { useRuntime, useStoreStatus } from '../hooks';

/** Loads state once, shows a skeleton briefly (simulated latency) and a recovery banner on corrupt storage (NFR-02). */
export function StoreProvider({ children }: { children: ReactNode }) {
  const rt = useRuntime();
  const status = useStoreStatus();
  const toast = useToast();
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    rt.init();
    const t = setTimeout(() => setMinDelayDone(true), 300);
    return () => clearTimeout(t);
  }, [rt]);

  useEffect(() => rt.onExternalUpdate(() => toast.info('Data updated in another tab.')), [rt, toast]);

  // FR-M10-4: regenerate notifications every 5 minutes while open.
  useEffect(() => {
    const id = setInterval(() => rt.syncNotifications(), 5 * 60_000);
    return () => clearInterval(id);
  }, [rt]);

  if (status.kind === 'recovery') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <div className="space-y-3">
              <h1 className="text-lg font-semibold text-navy-900">Stored data could not be loaded</h1>
              <p className="text-sm text-slate-700">{status.reason}</p>
              <p className="text-sm text-slate-700">Nothing has been deleted. The unreadable data has been kept under <code className="rounded bg-slate-100 px-1 text-xs">{status.corruptKey}</code>. You can download it for inspection, then reset the demonstration data to continue.</p>
              <div className="flex flex-wrap gap-2">
                <Button icon={<Download size={16} aria-hidden />} onClick={() => downloadText('securefdr-corrupted-data.json', rt.readCorrupt() ?? '')}>Download corrupted data</Button>
                <Button variant="primary" icon={<RotateCcw size={16} aria-hidden />} onClick={() => rt.recoverWithFreshSeed()}>Reset demo data</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  if (status.kind === 'loading' || !minDelayDone) return <PageSkeleton />;
  return <>{children}</>;
}
