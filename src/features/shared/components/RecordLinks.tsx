import { Link } from 'react-router-dom';
import { formatINR } from '@/lib/money';

export function FdrLink({ id }: { id: string }) {
  return <Link to={`/fdrs/${id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-navy-700 hover:underline">{id}</Link>;
}

export function InstitutionLink({ id, name }: { id: string; name?: string }) {
  return <Link to={`/institutions/${id}`} onClick={(e) => e.stopPropagation()} className="text-navy-700 hover:underline">{name ?? id}</Link>;
}

export function Money({ paise }: { paise: number }) {
  return <span className="tabular-nums">{formatINR(paise)}</span>;
}
