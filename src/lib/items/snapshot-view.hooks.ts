import { useAccountScope, useScopedPath } from "~/lib/accounts/account-scope.hooks";
import { useSettings } from "~/lib/settings/settings.store";
import { snapshotViewKey } from "./snapshot-view";
import { useSnapshotViews } from "./snapshot-view.store";

export function useSnapshotView() {
  const { accountId } = useAccountScope();
  const currency = useSettings((s) => s.currency);
  const marketplace = useSettings((s) => s.marketplace);
  const key = snapshotViewKey(accountId, currency, marketplace);
  const takenAt = useSnapshotViews((s) => (accountId ? s.views[key] : undefined));
  const select = useSnapshotViews((s) => s.select);
  return { takenAt, select: (time?: number) => select(key, time), accountId };
}

export function useInventoryPath(path: string): string | undefined {
  const scoped = useScopedPath(path);
  const { takenAt } = useSnapshotView();
  return scoped && takenAt !== undefined ? `${scoped}&snapshot=${takenAt}` : scoped;
}
