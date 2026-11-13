import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createImportManager } from "./manager.ts";
import { openDatabase } from "../db/db.ts";
import { collectItems } from "../items/collect.ts";
import type { Catalog } from "../items/catalog.types.ts";
import { summarizeValue } from "../dashboard.ts";

const page = (amount = "1") => ({
  success: 1,
  total_inventory_count: 1,
  more_items: 0,
  assets: [{ appid: 730, contextid: "2", assetid: "1", classid: "10", instanceid: "0", amount }],
  descriptions: [
    { classid: "10", instanceid: "0", name: "Example", market_hash_name: "Example", marketable: 1 },
  ],
});

test("imports persist, replacement stays separate, rejected pages preserve data, and live actions are unavailable", (t) => {
  const folder = mkdtempSync(join(tmpdir(), "oi-json-"));
  const db = openDatabase(folder);
  t.after(() => {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  });
  const manager = createImportManager(db);
  const first = manager.importInventory({
    label: "Main",
    pages: [page("3")],
    cookies: "MUST_NOT_PERSIST",
  });
  const second = manager.importInventory({ label: "Other", pages: [page("1")] });
  assert.equal(manager.getSnapshot().accounts.length, 2);
  const restored = createImportManager(db);
  assert.equal(restored.get(first.id).getImportedItems?.().length, 3);
  manager.importInventory({ label: "Main", pages: [page("5")] });
  assert.equal(manager.get(first.id).getImportedItems?.().length, 5);
  assert.equal(manager.get(second.id).getImportedItems?.().length, 1);
  assert.throws(() =>
    manager.importInventory({
      label: "Main",
      pages: [{ ...page(), more_items: 1, last_assetid: "1" }],
    }),
  );
  assert.equal(manager.get(first.id).getImportedItems?.().length, 5);
  assert.throws(() => manager.startLogin());
  assert.throws(() =>
    manager
      .get(first.id)
      .transferItems({ accountId: first.id, from: "inventory", to: "2", itemIds: ["1"] }),
  );
  assert.ok(!db.getCacheStale("json-import:v1:" + first.id)?.includes("MUST_NOT_PERSIST"));
  manager.remove(second.id);
  assert.equal(createImportManager(db).getSnapshot().accounts.length, 1);
});

test("expanded quantities produce correct dashboard values without catalog/GC calls", (t) => {
  const folder = mkdtempSync(join(tmpdir(), "oi-json-value-"));
  const db = openDatabase(folder);
  t.after(() => {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  });
  const manager = createImportManager(db);
  const imported = manager.importInventory({ label: "Main", pages: [page("3")] });
  const items = collectItems(
    manager.get(imported.id),
    {} as Catalog,
    { fetchedAt: 100, byName: new Map([["Example", { price: 1.25 }]]) },
    new Map(),
  ).map((row) => row.view);
  assert.equal(items.length, 3);
  assert.equal(summarizeValue(items).totalValue, 3.75);
});
