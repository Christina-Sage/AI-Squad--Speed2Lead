"use client";

import { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import type { Team } from "@/lib/teams";

// Header words to drop when parsing a pasted/CSV list, so a header row (e.g. a
// "Lead ID" or "domain" column heading) doesn't get treated as an identifier.
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
  "lead",
  "lead id",
  "email",
  "work email",
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

// Role-specific copy. BDR works accounts (Global Account ID, 001…); SDR works
// leads (Lead ID, 00Q…). The import filters whichever worklist the rep is on.
function importConfig(team: Team) {
  if (team === "SDR") {
    return {
      unit: "lead",
      Unit: "Lead",
      idType: "Lead ID",
      blurb:
        "Paste Lead IDs or work emails — one per line or comma-separated. Or upload a CSV. Each is looked up in the database.",
      placeholder: "00Q5Y00001Ab2Cd\njordan@acme.com",
      example: ["00Q5Y00001Ab2Cd", "00Q5Y00001Kp9Xr"],
      templateName: "workit-lead-import-template.csv",
    };
  }
  return {
    unit: "account",
    Unit: "Account",
    idType: "Global Account ID",
    blurb:
      "Paste Global Account IDs or website domains — one per line or comma-separated. Or upload a CSV. Each is looked up in the database.",
    placeholder: "0015Y00002ABC123\nacme.com",
    example: ["0015Y00002ABC123", "0015Y00000WAYN01"],
    templateName: "workit-account-import-template.csv",
  };
}

/**
 * "Import list" control that sits next to the Analyze search bar. Reps paste
 * identifiers (one per line or comma-separated) or upload a single-column CSV,
 * then it dispatches them to the worklist, which filters Today's Worklist down
 * to the matches. The panel spells out the required CSV shape — one column, the
 * ID for the rep's role — and offers a matching downloadable template.
 */
export function AccountImport({ team }: { team: Team }) {
  const cfg = importConfig(team);
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

  function downloadTemplate() {
    // A ready-to-fill CSV: the role's ID header plus a couple of example rows.
    const csv = [cfg.idType, ...cfg.example].join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cfg.templateName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function apply() {
    const identifiers = parseIdentifiers(text);
    if (identifiers.length === 0) return;
    window.dispatchEvent(new CustomEvent("workit:import-accounts", { detail: { identifiers } }));
    setText(""); // clear the pasted list on submit so the field doesn't hold stale values
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
          <div className="absolute right-0 z-20 mt-2 w-[380px] rounded-[12px] border border-border bg-card p-4 text-left shadow-lg">
            <div className="mb-1 text-[13.5px] font-semibold">Import {cfg.unit} list</div>
            <p className="mb-3 text-xs text-muted-foreground">{cfg.blurb}</p>

            {/* CSV format spec — one column, the ID for this role, extras ignored. */}
            <div className="mb-3 rounded-[10px] border border-primary/35 bg-primary-soft p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[12px] font-bold text-foreground">CSV format</span>
                <span className="text-[11px] text-muted-foreground">
                  One column — the first — is imported.
                </span>
              </div>
              <div className="overflow-hidden rounded-[8px] border border-border bg-card font-mono text-[11px]">
                <div className="grid grid-cols-[22px_1fr_64px]">
                  <div className="border-r border-b border-border bg-background px-2 py-1 text-center font-sans text-[10px] font-bold text-muted-foreground">
                    &nbsp;
                  </div>
                  <div className="border-r border-b border-border bg-background px-2 py-1 text-center font-sans text-[10px] font-bold text-muted-foreground">
                    A
                  </div>
                  <div className="border-b border-border bg-background px-2 py-1 text-center font-sans text-[10px] font-bold text-muted-foreground">
                    B
                  </div>

                  <div className="border-r border-b border-border bg-background px-2 py-1 text-center font-sans text-[10px] text-muted-foreground">
                    1
                  </div>
                  <div className="truncate border-r border-b border-border bg-primary-soft px-2 py-1 font-bold text-primary">
                    {cfg.idType}
                  </div>
                  <div
                    className="border-b border-border px-2 py-1 text-muted-foreground"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(-45deg, transparent, transparent 4px, var(--destructive-bg) 4px, var(--destructive-bg) 8px)",
                    }}
                  >
                    notes
                  </div>

                  <div className="border-r border-b border-border bg-background px-2 py-1 text-center font-sans text-[10px] text-muted-foreground">
                    2
                  </div>
                  <div className="truncate border-r border-b border-border px-2 py-1 text-foreground">
                    {cfg.example[0]}
                  </div>
                  <div
                    className="border-b border-border px-2 py-1 text-muted-foreground"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(-45deg, transparent, transparent 4px, var(--destructive-bg) 4px, var(--destructive-bg) 8px)",
                    }}
                  >
                    &nbsp;
                  </div>

                  <div className="col-span-3 flex items-center gap-1.5 px-2 py-1 font-sans text-[10.5px] text-destructive">
                    Column B onward is ignored — only column A is read.
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11.5px] text-muted-foreground">
                  Each row = one <span className="font-mono text-primary">{cfg.idType}</span>
                </span>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-primary/40 bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-primary hover:brightness-105"
                >
                  <Download className="size-3.5" />
                  Download {cfg.unit} template
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={cfg.placeholder}
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
                Submit worklist
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
