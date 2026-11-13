import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSnapshotViews, snapshotViewKey } from "./snapshot-view.ts";

void test("historical selections stay with their portfolio and pricing scope", () => {
  const main = snapshotViewKey("main", "USD", "buff163");
  const views = parseSnapshotViews(JSON.stringify({ [main]: 123, invalid: -1, bad: "123" }));
  assert.deepEqual(views, { [main]: 123 });
  assert.equal(views[snapshotViewKey("other", "USD", "buff163")], undefined);
  assert.equal(views[snapshotViewKey("main", "CAD", "buff163")], undefined);
  assert.equal(views[snapshotViewKey("main", "USD", "steam")], undefined);
  assert.deepEqual(parseSnapshotViews("broken"), {});
});
