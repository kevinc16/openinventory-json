import { createHash } from "node:crypto";
import type { AccountLabel } from "../../src/lib/accounts/accounts.types.ts";
import type { ItemView } from "../../src/lib/items/item.types.ts";
import type { AppSnapshot, StorageSnapshot } from "../../src/lib/storage/storage.types.ts";
import type { Database } from "../db/db.types.ts";
import { UserFacingError, type StorageGateway } from "../steam/steam.types.ts";
import { parseInventoryPages } from "./inventory.ts";

type Portfolio = { id: string; name: string; importedAt: number; items: readonly ItemView[] };
const PREFIX = "json-import:v1:";
const unavailable = (): never => {
  throw new UserFacingError(
    "This JSON-only app does not connect to Steam. Reimport your inventory to update quantities.",
    409,
  );
};

/** Only normalized item rows are persisted. Never reads Steam session files. */
export function createImportManager(db: Database) {
  const portfolios = new Map<string, Portfolio>();
  const gateways = new Map<string, StorageGateway>();
  const listeners = new Set<(snapshot: AppSnapshot) => void>();
  const readyListeners: ((id: string, gateway: StorageGateway) => void)[] = [];
  let revision = 0;
  let lastLogin: AppSnapshot["lastLogin"] = null;
  for (const account of db.listAccounts()) {
    const raw = db.getCacheStale(PREFIX + account.steamId);
    if (!raw) continue;
    const parsed: unknown = JSON.parse(raw);
    const portfolio = parsed as Portfolio;
    if (
      portfolio.id !== account.steamId ||
      typeof portfolio.name !== "string" ||
      !Array.isArray(portfolio.items)
    )
      throw new Error("A saved JSON portfolio is invalid; its existing data was preserved.");
    portfolios.set(portfolio.id, portfolio);
  }
  function get(id: string): StorageGateway {
    if (!portfolios.has(id)) throw new UserFacingError("Imported portfolio not found.", 404);
    const existing = gateways.get(id);
    if (existing) return existing;
    const snapshot = (): StorageSnapshot => ({
      auth: { status: "ready", displayName: portfolios.get(id)!.name },
      units: [],
      loadingUnits: false,
      transfer: { status: "idle" },
      syncError: null,
      revision,
      importedAt: portfolios.get(id)!.importedAt,
    });
    const gateway: StorageGateway = {
      getSnapshot: snapshot,
      getImportedItems: () => portfolios.get(id)!.items,
      getSteamId: () => id,
      getInventory: () => [],
      getUnits: () => [],
      subscribe: () => () => {},
      notifyChanged: emit,
      ensureConnected() {},
      reconnect: unavailable,
      disconnect() {},
      logout: unavailable,
      refreshUnits: async () => {},
      transferItems: unavailable,
      transferPlan: unavailable,
      renameUnit: unavailable,
      activateTerminal: unavailable,
      requestNextOffer: unavailable,
      getTerminalOffer: unavailable,
      cancelTransfer: unavailable,
      dismissTransfer() {},
      onReady(listener) {
        listener(id);
      },
      getWebCookies: unavailable,
    };
    gateways.set(id, gateway);
    return gateway;
  }
  function getSnapshot(): AppSnapshot {
    return {
      accounts: db
        .listAccounts()
        .filter((account) => portfolios.has(account.steamId))
        .map((account) => ({
          ...account,
          displayName: portfolios.get(account.steamId)!.name,
          snapshot: get(account.steamId).getSnapshot(),
        })),
      login: { status: "signed-out" },
      lastLogin,
      revision,
    };
  }
  function emit() {
    revision++;
    const state = getSnapshot();
    for (const listener of listeners) listener(state);
  }
  return {
    getSnapshot,
    get,
    ids: () => [...portfolios.keys()],
    all: () => [...portfolios.keys()].map((steamId) => ({ steamId, gateway: get(steamId) })),
    subscribe(listener: (snapshot: AppSnapshot) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onReady(listener: (id: string, gateway: StorageGateway) => void) {
      readyListeners.push(listener);
      for (const id of portfolios.keys()) listener(id, get(id));
    },
    startLogin: unavailable,
    cancelLogin() {},
    notifyChanged(_id: string) {
      emit();
    },
    setLabel(id: string, label: AccountLabel | null) {
      get(id);
      db.setAccountLabel(id, label);
      emit();
    },
    remove(id: string) {
      get(id);
      db.removeAccount(id);
      db.setCache(PREFIX + id, "");
      portfolios.delete(id);
      gateways.delete(id);
      emit();
    },
    importInventory(value: unknown) {
      const body = value as { label?: unknown; pages?: unknown; portfolioId?: unknown };
      if (
        !body ||
        typeof body.label !== "string" ||
        !body.label.trim() ||
        body.label.trim().length > 64 ||
        /[\u0000-\u001f\u007f]/.test(body.label)
      )
        throw new UserFacingError(
          "Choose a portfolio name between 1 and 64 printable characters.",
          400,
        );
      const name = body.label.trim();
      const generated = (
        90_000_000_000_000_000n +
        (BigInt("0x" + createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 16)) %
          10_000_000_000_000_000n)
      ).toString();
      if (
        body.portfolioId !== undefined &&
        (typeof body.portfolioId !== "string" || !portfolios.has(body.portfolioId))
      )
        throw new UserFacingError("Choose an existing portfolio to replace.", 400);
      const id = typeof body.portfolioId === "string" ? body.portfolioId : generated;
      const items = parseInventoryPages(body.pages, id); // Validate completely before replacing anything.
      const portfolio: Portfolio = { id, name, importedAt: Date.now(), items };
      const added = !portfolios.has(id);
      db.setCache(PREFIX + id, JSON.stringify(portfolio));
      db.addAccount(id);
      portfolios.set(id, portfolio);
      lastLogin = { sequence: (lastLogin?.sequence ?? 0) + 1, steamId: id, added };
      emit();
      for (const listener of readyListeners) listener(id, get(id));
      return { id, name, itemCount: items.length, importedAt: portfolio.importedAt };
    },
  };
}
