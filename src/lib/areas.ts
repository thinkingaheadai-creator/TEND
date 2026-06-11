export const AREAS = [
  { id: "finance", label: "Finance" },
  { id: "family", label: "Family" },
  { id: "health", label: "Health" },
  { id: "admin", label: "Admin" },
  { id: "travel", label: "Travel" },
  { id: "personal", label: "Personal" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];
