/** Selections are isolated by portfolio, currency and price source. */
export function snapshotViewKey(
  account: string | undefined,
  currency: string,
  marketplace: string,
): string {
  return `${account ?? ""}:${currency}:${marketplace}`;
}

export function parseSnapshotViews(raw: string | null): Record<string, number> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, time]) => key.length < 100 && Number.isSafeInteger(time) && time > 0)
        .slice(0, 1000),
    );
  } catch {
    return {};
  }
}
