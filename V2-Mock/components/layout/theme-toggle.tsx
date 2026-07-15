"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // The inline script in layout.tsx already applied the class pre-hydration;
    // read the resolved state from the DOM.
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle light/dark"
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] text-foreground hover:border-muted-foreground"
    >
      {dark === null ? "…" : dark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
