/** File signature checks (architecture.md §18). */
export type FileCheckError = 'EXTENSION' | 'MIME' | 'SIGNATURE' | 'SIZE' | 'EMPTY';

const EXT_MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function signatureMatches(mime: string, head: Uint8Array): boolean {
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (mime) {
    case 'application/pdf':
      return starts([0x25, 0x50, 0x44, 0x46]); // %PDF
    case 'image/png':
      return starts([0x89, 0x50, 0x4e, 0x47]);
    case 'image/jpeg':
      return starts([0xff, 0xd8, 0xff]);
    default:
      return false;
  }
}

export function checkFile(
  input: { name: string; type: string; size: number; head: Uint8Array },
  limits: { maxBytes: number; allowedMime: string[] },
): { ok: true; mime: string } | { ok: false; code: FileCheckError; message: string } {
  const ext = extensionOf(input.name);
  const expected = EXT_MIME[ext];
  if (!expected || !limits.allowedMime.includes(expected)) {
    return { ok: false, code: 'EXTENSION', message: `"${input.name}" is not an allowed file type. Use PDF, JPG or PNG.` };
  }
  if (input.type && input.type !== expected) {
    return { ok: false, code: 'MIME', message: `"${input.name}" reports type ${input.type}, which does not match its extension.` };
  }
  if (input.size === 0) return { ok: false, code: 'EMPTY', message: `"${input.name}" is empty.` };
  if (input.size > limits.maxBytes) {
    const mb = (limits.maxBytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '');
    return { ok: false, code: 'SIZE', message: `"${input.name}" is larger than the ${mb} MB limit.` };
  }
  if (!signatureMatches(expected, input.head)) {
    return { ok: false, code: 'SIGNATURE', message: `"${input.name}" content does not match a ${ext.toUpperCase()} file signature.` };
  }
  return { ok: true, mime: expected };
}
