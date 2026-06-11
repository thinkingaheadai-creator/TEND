import Dexie, { type Table } from "dexie";
import type { Recurrence } from "./recurrence";

export type Area =
  | "finance"
  | "family"
  | "health"
  | "admin"
  | "travel"
  | "personal";

export type Item = {
  id: string;
  title: string;
  notes?: string;
  dueAt?: number | null;
  completedAt?: number | null;
  createdAt: number;
  area?: Area | null;
  tags?: string[];
  recurrence?: Recurrence | null;
  completions?: number[];
};

class TendDB extends Dexie {
  items!: Table<Item, string>;

  constructor() {
    super("tend");
    this.version(1).stores({
      items: "id, dueAt, completedAt, createdAt, area",
    });
    this.version(2)
      .stores({
        items: "id, dueAt, completedAt, createdAt, area, *completions",
      })
      .upgrade((tx) =>
        tx
          .table("items")
          .toCollection()
          .modify((item) => {
            if (!Array.isArray(item.completions)) item.completions = [];
          })
      );
  }
}

export const db = new TendDB();
