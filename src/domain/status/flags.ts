import type { DocumentKind, InstrumentCategory, Settings } from '../types';

export function missingRequiredDocs(category: InstrumentCategory, presentKinds: string[], settings: Settings): DocumentKind[] {
  const req = settings.categoryRequirements[category]?.requiredDocs ?? [];
  return req.filter((k) => !presentKinds.includes(k));
}
