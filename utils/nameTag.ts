export const TAG_PREFIX = '⟪id:';
export const TAG_SUFFIX = '⟫';

export function buildTaggedName(baseName: string, anonId: string): string {
  const trimmed = (baseName || '').trim();
  return `${trimmed} ${TAG_PREFIX}${anonId}${TAG_SUFFIX}`;
}

export function stripDeviceTag(name?: string | null): string {
  if (!name) return 'Anonymous';
  return name.replace(/\s*⟪id:[^⟫]+⟫$/, '').trim();
}

// Given an array of names (already stripped of device tags for display),
// append (2), (3), ... to repeated base names while leaving first occurrence unsuffixed.
export function addOrdinalSuffixes(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const base = (name || '').trim();
    const next = (counts.get(base) || 0) + 1;
    counts.set(base, next);
    return next === 1 ? base : `${base} (${next})`;
  });
}

