"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

// The theme lives on <html class="dark"> — applied pre-hydration by the inline
// script in layout.tsx. Read it through useSyncExternalStore so the value is
// sourced from the DOM (the external system) without a setState-in-effect, and
// stays in sync if the class changes from anywhere.
function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

// No DOM on the server; render the neutral placeholder until hydration.
function getServerSnapshot(): boolean | null {
  return null;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
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
