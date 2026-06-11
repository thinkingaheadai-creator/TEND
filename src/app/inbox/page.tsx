"use client";

import { useState } from "react";
import InboxRow from "@/components/InboxRow";
import ItemDetail from "@/components/ItemDetail";
import { useInboxItems } from "@/lib/items";

export default function InboxPage() {
  const items = useInboxItems();
  const count = items?.length ?? 0;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const summary =
    items === undefined
      ? ""
      : count === 0
        ? "Inbox zero"
        : `${count} ${count === 1 ? "item" : "items"} waiting`;

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8 md:px-12 md:py-12">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted">Inbox</p>
        <h1 className="mt-1 font-serif text-3xl text-foreground">To triage</h1>
        <p className="mt-2 text-sm text-muted">{summary}</p>
      </header>

      <div className="mt-6 mb-6 border-t border-line" />

      {count === 0 ? (
        <p className="mt-16 text-center font-serif italic text-faint">
          Nothing to triage. Capture with ⌘K.
        </p>
      ) : (
        <div>
          {items!.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              onOpen={setSelectedItemId}
            />
          ))}
        </div>
      )}

      <ItemDetail
        id={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
