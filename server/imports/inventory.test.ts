import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInventoryPages } from "./inventory.ts";

const description = {
  classid: "10",
  instanceid: "0",
  name: "<Example>",
  market_hash_name: "Example",
  marketable: 1,
  icon_url: "safe/icon",
  tags: [{ category: "Type", localized_tag_name: "Container" }],
};
const asset = (id: string, amount = "1") => ({
  appid: 730,
  contextid: "2",
  assetid: id,
  classid: "10",
  instanceid: "0",
  amount,
});
const page = (assets = [asset("1")], total = assets.length) => ({
  success: 1,
  assets,
  descriptions: [description],
  total_inventory_count: total,
  more_items: 0,
});

test("maps complete exports, expands amounts and never invents float data", () => {
  const rows = parseInventoryPages([page([asset("1", "3")])], "90000000000000001");
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.id)).size, 3);
  assert.equal(rows[0]?.name, "<Example>");
  assert.equal(rows[0]?.wear, null);
  assert.equal(rows[0]?.marketHashName, "Example");
  assert.equal(rows[0]?.accountId, "90000000000000001");
});

test("accepts ordered complete pagination, rejects missing pages and duplicate assets", () => {
  const first = { ...page([asset("1")], 2), more_items: 1, last_assetid: "1" };
  const last = page([asset("2")], 2);
  assert.equal(parseInventoryPages([first, last], "90000000000000001").length, 2);
  for (const pages of [[first], [last], [first, page([asset("1")], 2)]]) {
    assert.throws(() => parseInventoryPages(pages, "90000000000000001"));
  }
});

test("rejects wrong game/context, invalid amounts, missing descriptions and excessive expansion", () => {
  for (const change of [
    { appid: 440 },
    { contextid: "99" },
    { amount: "-1" },
    { amount: "0" },
    { amount: "20001" },
    { classid: "999" },
  ]) {
    assert.throws(() =>
      parseInventoryPages(
        [page([{ ...asset("1"), ...change } as ReturnType<typeof asset>])],
        "90000000000000001",
      ),
    );
  }
  assert.throws(() => parseInventoryPages([{ ...page(), success: 0 }], "90000000000000001"));
  assert.throws(() => parseInventoryPages({ cookies: "not an export" }, "90000000000000001"));
});

test("nonmarketable items stay unpriced and a genuine empty inventory remains empty", () => {
  const rows = parseInventoryPages(
    [{ ...page(), descriptions: [{ ...description, marketable: 0 }] }],
    "90000000000000001",
  );
  assert.equal(rows[0]?.marketHashName, null);
  assert.deepEqual(parseInventoryPages([page([], 0)], "90000000000000001"), []);
});

test("keeps descriptions separate across contexts and accepts an empty completed context", () => {
  const main = page();
  const empty = { success: 1, total_inventory_count: 0, more_items: 0 };
  assert.equal(parseInventoryPages([main, empty], "90000000000000001").length, 1);
  const other = {
    ...page([{ ...asset("1"), contextid: "16" }]),
    descriptions: [{ ...description, marketable: 0 }],
  };
  const rows = parseInventoryPages([main, other], "90000000000000001");
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.marketHashName, "Example");
  assert.equal(rows[1]?.marketHashName, null);
  assert.notEqual(rows[0]?.id, rows[1]?.id);
});
