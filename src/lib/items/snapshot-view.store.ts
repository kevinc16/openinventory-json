import { create } from "zustand";
import { parseSnapshotViews } from "./snapshot-view";

const STORAGE_KEY = "openinventory-json:snapshot-views";
function load() {
  try {
    return parseSnapshotViews(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}
export const useSnapshotViews = create<{
  views: Record<string, number>;
  select: (key: string, time?: number) => void;
  latest: (account: string) => void;
}>((set) => {
  function save(views: Record<string, number>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    } catch {
      /* Session-only when storage is unavailable. */
    }
    return { views };
  }
  return {
    views: load(),
    select: (key, time) =>
      set((state) => {
        const views = { ...state.views };
        if (time === undefined) delete views[key];
        else views[key] = time;
        return save(views);
      }),
    latest: (account) =>
      set((state) =>
        save(
          Object.fromEntries(
            Object.entries(state.views).filter(([key]) => !key.startsWith(`${account}:`)),
          ),
        ),
      ),
  };
});
