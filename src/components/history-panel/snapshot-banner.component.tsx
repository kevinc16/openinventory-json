import { Button } from "~/components/button/button.component";
import { useSnapshotView } from "~/lib/items/snapshot-view.hooks";
import { formatDateTime } from "~/utils/format";

export function SnapshotBanner() {
  const { takenAt, select } = useSnapshotView();
  if (takenAt === undefined) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted p-3 text-sm"
    >
      <p>
        Viewing saved inventory and prices from {formatDateTime(takenAt)}. Your latest import is
        unchanged.
      </p>
      <Button small onClick={() => select()}>
        Return to latest inventory
      </Button>
    </div>
  );
}
