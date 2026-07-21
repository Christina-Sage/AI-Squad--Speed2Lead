"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

// Header words to drop when parsing a pasted/CSV list, so a "domain" header row
// doesn't get treated as an identifier.
const HEADER_WORDS = new Set([
  "domain",
  "website",
  "url",
  "account",
  "account name",
  "name",
  "id",
  "account id",
  "global account id",
]);

function parseIdentifiers(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of text.split(/[\n,]/)) {
    const t = token.trim();
    if (!t || HEADER_WORDS.has(t.toLowerCase())) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * "Import list" control that sits next to the Analyze Account search bar. Users
 * paste domains / Global Account IDs / names (one per line or comma-separated) or
 * upload a CSV (first column), then it dispatches the identifiers to the worklist,
 * which filters Today's Worklist down to the matches.
 */
export function AccountImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      // Take the first column of each CSV line.
      const ids = raw
        .split(/\r?\n/)
        .map((line) => line.split(",")[0].trim())
        .filter(Boolean);
      setText((prev) => (prev.trim() ? prev.trim() + "\n" : "") + ids.join("\n"));
    };
    reader.readAsText(file);
    e.target.value = ""; // let the same file be re-selected later
  }

  function apply() {
    const identifiers = parseIdentifiers(text);
    if (identifiers.length === 0) return;
    window.dispatchEvent(new CustomEvent("workit:import-accounts", { detail: { identifiers } }));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold shadow-sm hover:border-muted-foreground"
      >
        <Upload className="size-4 text-muted-foreground" />
        Import list
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-[340px] rounded-[12px] border border-border bg-card p-4 text-left shadow-lg">
            <div className="mb-1 text-[13.5px] font-semibold">Import account list</div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Paste domains, Global Account IDs, or account names — one per line or comma-separated. Or
              upload a CSV (first column is used).
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"acme.com\nglobex.org\n0015Y00000WAYN01"}
              className="w-full resize-y rounded-[8px] border border-input bg-transparent p-2 font-mono text-[12.5px] outline-none focus-visible:border-ring"
            />
            <div className="mt-2.5 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={onFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-[9px] border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground"
              >
                Upload CSV
              </button>
              <span className="flex-1" />
              {text.trim() && (
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="px-2 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={apply}
                disabled={!text.trim()}
                className="rounded-[9px] border border-primary bg-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-45"
              >
                Filter worklist
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
