"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

// The <html> class list is the source of truth (the inline script in layout.tsx
// applies it pre-hydration). Read it through an external store rather than
// mirroring it into effect-driven state: getServerSnapshot returns null so SSR
// and hydration render the neutral "…" label, then the client snapshot resolves
// the real theme. `toggle` flips the class and notifies subscribers to re-render.
const themeListeners = new Set<() => void>();
function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}
function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => null);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    themeListeners.forEach((listener) => listener());
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
