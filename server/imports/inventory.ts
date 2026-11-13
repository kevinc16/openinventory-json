import type { ItemView } from "../../src/lib/items/item.types.ts";
import { UserFacingError } from "../steam/steam.types.ts";

type RecordValue = Record<string, unknown>;
const MAX_UNITS = 20_000;
const DIGITS = /^\d{1,20}$/;
const COLOR = /^[a-fA-F0-9]{6}$/;

function fail(message: string): never {
  throw new UserFacingError(message, 400);
}
function record(value: unknown): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail("Expected Steam inventory response objects.");
  return value as RecordValue;
}
function text(value: unknown, max = 512): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail("An inventory item has an invalid name or identifier.");
  return value;
}
function id(value: unknown): string {
  const result = text(value, 20);
  if (!DIGITS.test(result)) fail("Invalid inventory identifier.");
  return result;
}

/** Standard Steam Community response pages only. No cookies, HTML execution or GC login. */
export function parseInventoryPages(value: unknown, accountId: string): readonly ItemView[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100)
    fail("Select between 1 and 100 inventory response pages.");
  const descriptions = new Map<string, RecordValue>();
  const assets = new Map<string, RecordValue>();
  const streams = new Map<string, { count: number; declared: number; more: boolean }>();
  for (const raw of value) {
    const page = record(raw);
    if (page.success !== 1 && page.success !== true)
      fail("Steam reported an unsuccessful inventory response.");
    const declared = page.total_inventory_count;
    if (
      !Number.isSafeInteger(declared) ||
      (declared as number) < 0 ||
      (declared as number) > MAX_UNITS
    )
      fail("The export must declare a valid inventory count (maximum 20,000).");
    const pageAssets = page.assets ?? (declared === 0 ? [] : undefined);
    const pageDescriptions = page.descriptions ?? (declared === 0 ? [] : undefined);
    if (!Array.isArray(pageAssets) || !Array.isArray(pageDescriptions))
      fail("Missing assets or descriptions. Save the raw inventory JSON response.");
    const more = page.more_items === 1 || page.more_items === true;
    if (page.more_items !== undefined && ![0, 1, false, true].includes(page.more_items as number))
      fail("Invalid pagination flag.");
    if (more && (typeof page.last_assetid !== "string" || !DIGITS.test(page.last_assetid)))
      fail("Missing pagination cursor.");
    if (pageAssets.length === 0 && declared === 0 && !more) continue;
    const contexts = new Set(pageAssets.map((rawAsset) => String(record(rawAsset).contextid)));
    if (contexts.size > 1) fail("Each response page must describe one inventory context.");
    const context = [...contexts][0] ?? "2";
    if (!["2", "16"].includes(context)) fail("Only CS2 inventory contexts 2 and 16 are supported.");
    const previous = streams.get(context);
    if (previous && (!previous.more || previous.declared !== declared))
      fail("Pages are duplicated, out of order, or have inconsistent counts.");
    streams.set(context, {
      count: (previous?.count ?? 0) + pageAssets.length,
      declared: declared as number,
      more,
    });
    for (const rawDescription of pageDescriptions) {
      const description = record(rawDescription);
      if (description.appid !== undefined && Number(description.appid) !== 730)
        fail("Only CS2 app 730 is supported.");
      const key = `${context}:${id(description.classid)}:${id(description.instanceid ?? "0")}`;
      const previousDescription = descriptions.get(key);
      if (
        previousDescription &&
        JSON.stringify(previousDescription) !== JSON.stringify(description)
      )
        fail("Conflicting item descriptions. Re-export all pages together.");
      descriptions.set(key, description);
    }
    for (const rawAsset of pageAssets) {
      const asset = record(rawAsset);
      if (Number(asset.appid) !== 730) fail("Only CS2 app 730 is supported.");
      const key = `${context}:${id(asset.assetid)}`;
      if (assets.has(key)) fail("Duplicate assets: select each page only once.");
      assets.set(key, asset);
    }
  }
  if ([...streams.values()].some((stream) => stream.more || stream.count !== stream.declared))
    fail("The inventory export is incomplete. Include every page, ending with more_items=0.");
  const items: ItemView[] = [];
  for (const [assetKey, asset] of assets) {
    const description = descriptions.get(
      `${asset.contextid}:${id(asset.classid)}:${id(asset.instanceid ?? "0")}`,
    );
    if (!description) fail("An asset is missing its item description.");
    const amount = asset.amount ?? "1";
    if ((typeof amount !== "string" && typeof amount !== "number") || !/^\d+$/.test(String(amount)))
      fail("Invalid item quantity.");
    const quantity = Number(amount);
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || items.length + quantity > MAX_UNITS)
      fail("Invalid quantity or more than 20,000 total items.");
    const tags = Array.isArray(description.tags) ? description.tags.map(record) : [];
    const tag = (category: string) => tags.find((tag) => tag.category === category);
    const rarity = tag("Rarity");
    const icon =
      typeof description.icon_url === "string" &&
      /^[A-Za-z0-9_+\-/=]{1,4096}$/.test(description.icon_url)
        ? description.icon_url
        : null;
    const name = text(description.name ?? description.market_hash_name);
    if (![0, 1, false, true].includes(description.marketable as number))
      fail("Missing or invalid marketability flag.");
    const marketable = description.marketable === 1 || description.marketable === true;
    for (let unit = 0; unit < quantity; unit++) {
      items.push({
        id: `${assetKey}:${unit}`,
        name,
        marketHashName: marketable ? text(description.market_hash_name) : null,
        imageUrl: icon
          ? `https://community.akamai.steamstatic.com/economy/image/${icon}/128fx128f`
          : null,
        rarityColor:
          typeof rarity?.color === "string" && COLOR.test(rarity.color) ? `#${rarity.color}` : null,
        rarityName:
          typeof rarity?.localized_tag_name === "string" ? rarity.localized_tag_name : null,
        category:
          typeof tag("Type")?.localized_tag_name === "string"
            ? (tag("Type")!.localized_tag_name as string)
            : "Other",
        customName: null,
        wear: null,
        paintSeed: null,
        paintIndex: null,
        minWear: null,
        maxWear: null,
        wearName:
          typeof tag("Exterior")?.localized_tag_name === "string"
            ? (tag("Exterior")!.localized_tag_name as string)
            : null,
        isStatTrak: name.startsWith("StatTrak™"),
        isSouvenir: name.startsWith("Souvenir"),
        stickers: [],
        charms: [],
        pattern: null,
        videoUrl: null,
        terminal: null,
        tradableAfter: null,
        price: null,
        locationId: "inventory",
        locationName: "Imported inventory",
        collections: [],
        accountId,
        note: null,
      });
    }
  }
  return items;
}
