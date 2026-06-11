"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { THEMES } from "@/lib/themes";

function ensureMeta(name: string): HTMLMetaElement {
  let meta = document.querySelector(
    `meta[name="${name}"]`
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  return meta;
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeId } = useSettings();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
    } else {
      document.documentElement.setAttribute("data-theme", themeId);
    }

    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    ensureMeta("theme-color").setAttribute("content", theme.tokens.bg);
    ensureMeta("apple-mobile-web-app-status-bar-style").setAttribute(
      "content",
      theme.mode === "light" ? "default" : "black-translucent"
    );
  }, [themeId]);

  return <>{children}</>;
}
