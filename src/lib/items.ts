"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "./db";
import { uuid } from "./uuid";
import { useDateKey } from "./clock";
import { cancelPushForItem, syncPushForItem } from "./notifications";

export async function addItem(
  partial: Partial<Item> & { title: string }
): Promise<string> {
  const id = partial.id ?? uuid();
  const item: Item = {
    notes: "",
    tags: [],
    dueAt: null,
    completedAt: null,
    area: null,
    recurrence: null,
    completions: [],
    ...partial,
    id,
    createdAt: partial.createdAt ?? Date.now(),
  };
  try {
    await db.items.add(item);
  } catch (error) {
    console.error("Tend: write failed", "addItem", error);
    throw error;
  }
  console.log("[capture] addItem completed, calling syncPushForItem", {
    itemId: item.id,
    dueAt: item.dueAt,
  });
  void syncPushForItem(item);
  return id;
}

export async function completeItem(id: string): Promise<void> {
  try {
    await db.items.update(id, { completedAt: Date.now() });
  } catch (error) {
    console.error("Tend: write failed", "completeItem", error);
    throw error;
  }
  void cancelPushForItem(id);
}

export async function uncompleteItem(id: string): Promise<void> {
  try {
    await db.items.update(id, { completedAt: null });
  } catch (error) {
    console.error("Tend: write failed", "uncompleteItem", error);
    throw error;
  }
  const item = await db.items.get(id);
  if (item) void syncPushForItem(item);
}

export async function deleteItem(id: string): Promise<void> {
  void cancelPushForItem(id);
  try {
    await db.items.delete(id);
  } catch (error) {
    console.error("Tend: write failed", "deleteItem", error);
    throw error;
  }
}

export async function updateItem(
  id: string,
  patch: Partial<Item>
): Promise<void> {
  try {
    await db.items.update(id, patch);
  } catch (error) {
    console.error("Tend: write failed", "updateItem", error);
    throw error;
  }
  const item = await db.items.get(id);
  if (item) void syncPushForItem(item);
}

export async function scheduleItem(id: string, dueAt: number): Promise<void> {
  try {
    await db.items.update(id, { dueAt });
  } catch (error) {
    console.error("Tend: write failed", "scheduleItem", error);
    throw error;
  }
  const item = await db.items.get(id);
  if (item) void syncPushForItem(item);
}

export async function assignArea(id: string, area: string): Promise<void> {
  try {
    await db.items.update(id, { area: area as Item["area"] });
  } catch (error) {
    console.error("Tend: write failed", "assignArea", error);
    throw error;
  }
  const item = await db.items.get(id);
  if (item) void syncPushForItem(item);
}

export async function completeTracker(id: string): Promise<void> {
  try {
    const now = Date.now();
    const item = await db.items.get(id);
    if (!item) return;
    const completions = Array.isArray(item.completions)
      ? [...item.completions, now]
      : [now];
    await db.items.update(id, { completions, completedAt: now });
  } catch (error) {
    console.error("Tend: write failed", "completeTracker", error);
    throw error;
  }
  void cancelPushForItem(id);
}

export async function uncompleteTracker(id: string): Promise<void> {
  try {
    const item = await db.items.get(id);
    if (!item) return;
    const completions = Array.isArray(item.completions)
      ? [...item.completions]
      : [];
    completions.pop();
    const completedAt =
      completions.length > 0 ? completions[completions.length - 1] : null;
    await db.items.update(id, { completions, completedAt });
  } catch (error) {
    console.error("Tend: write failed", "uncompleteTracker", error);
    throw error;
  }
}

export function isTracker(item: Item): boolean {
  return item.recurrence != null;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function compareTodayItems(a: Item, b: Item): number {
  const aHasDue = a.dueAt != null;
  const bHasDue = b.dueAt != null;
  if (aHasDue && !bHasDue) return -1;
  if (!aHasDue && bHasDue) return 1;
  if (aHasDue && bHasDue) return (a.dueAt as number) - (b.dueAt as number);
  return b.createdAt - a.createdAt;
}

function compareTrackers(a: Item, b: Item): number {
  const aArea = a.area ?? "";
  const bArea = b.area ?? "";
  if (aArea !== bArea) return aArea.localeCompare(bArea);
  return a.title.localeCompare(b.title);
}

export function useTodayItems(): Item[] | undefined {
  const dateKey = useDateKey();
  return useLiveQuery(async () => {
    const end = endOfToday();
    const all = await db.items.toArray();
    return all
      .filter(
        (item) =>
          item.recurrence == null &&
          item.completedAt == null &&
          (item.dueAt == null || item.dueAt <= end)
      )
      .sort(compareTodayItems);
  }, [dateKey]);
}

export function useOverdueItems(): Item[] | undefined {
  const dateKey = useDateKey();
  return useLiveQuery(async () => {
    const start = startOfToday();
    const all = await db.items.toArray();
    return all
      .filter(
        (item) =>
          item.recurrence == null &&
          item.completedAt == null &&
          item.dueAt != null &&
          (item.dueAt as number) < start
      )
      .sort((a, b) => (a.dueAt as number) - (b.dueAt as number));
  }, [dateKey]);
}

export function useCompletedTodayItems(): Item[] | undefined {
  const dateKey = useDateKey();
  return useLiveQuery(async () => {
    const start = startOfToday();
    const end = endOfToday();
    const all = await db.items.toArray();
    return all
      .filter(
        (item) =>
          item.recurrence == null &&
          item.completedAt != null &&
          (item.completedAt as number) >= start &&
          (item.completedAt as number) <= end
      )
      .sort((a, b) => (b.completedAt as number) - (a.completedAt as number));
  }, [dateKey]);
}

export function useInboxItems(): Item[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.items.toArray();
    return all
      .filter(
        (item) =>
          item.recurrence == null &&
          item.dueAt == null &&
          item.area == null &&
          item.completedAt == null
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  });
}

export function useTrackers(): Item[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.items.toArray();
    return all.filter((item) => item.recurrence != null).sort(compareTrackers);
  });
}

export function useItem(id: string | null): Item | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const item = await db.items.get(id);
    return item ?? null;
  }, [id]);
}

export function useItemsBetween(
  from: number,
  to: number
): Item[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.items.toArray();
    return all
      .filter((item) => {
        if (item.recurrence != null) return false;
        if (item.dueAt == null) return false;
        const due = item.dueAt as number;
        if (due < from || due > to) return false;
        if (item.completedAt == null) return true;
        return (item.completedAt as number) > from;
      })
      .sort((a, b) => (a.dueAt as number) - (b.dueAt as number));
  }, [from, to]);
}

export function useAgendaItems(daysAhead: number = 14): Item[] | undefined {
  const dateKey = useDateKey();
  return useLiveQuery(async () => {
    const start = startOfToday();
    const end = start + daysAhead * 24 * 60 * 60 * 1000;
    const all = await db.items.toArray();
    return all
      .filter((item) => {
        if (item.recurrence != null) return false;
        if (item.dueAt == null) return false;
        const due = item.dueAt as number;
        if (item.completedAt == null && due < start) return true;
        if (item.completedAt != null) return false;
        return due >= start && due <= end;
      })
      .sort((a, b) => (a.dueAt as number) - (b.dueAt as number));
  }, [daysAhead, dateKey]);
}
