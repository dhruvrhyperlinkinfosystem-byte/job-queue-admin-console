import { create } from "zustand";

interface SelectionState {
  ids: ReadonlySet<string>;
  toggle: (id: string) => void;
  add: (ids: readonly string[]) => void;
  remove: (ids: readonly string[]) => void;
  clear: () => void;
}

/** Ids ticked for bulk actions on the jobs list. */
export const useSelectionStore = create<SelectionState>((set) => ({
  ids: new Set(),
  toggle: (id) =>
    set((state) => {
      const ids = new Set(state.ids);
      if (!ids.delete(id)) ids.add(id);
      return { ids };
    }),
  add: (added) => set((state) => ({ ids: new Set([...state.ids, ...added]) })),
  remove: (removed) =>
    set((state) => ({ ids: new Set([...state.ids].filter((id) => !removed.includes(id))) })),
  clear: () => set({ ids: new Set() }),
}));
