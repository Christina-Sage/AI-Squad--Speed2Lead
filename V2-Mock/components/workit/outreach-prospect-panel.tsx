"use client";

import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SettingsIcon,
  XIcon,
  ClockIcon,
  PhoneIcon,
  MailIcon,
  PlusIcon,
  ShieldIcon,
  LinkIcon,
  CloudIcon,
  SendIcon,
} from "lucide-react";

export interface OutreachProspect {
  name: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  /** Salesforce record type — shown on the task header. */
  kind?: "Contact" | "Lead";
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/** Deterministic mock phone numbers for a prospect (no real telephony). */
function mockPhones(name: string): { office: string; mobile: string } {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const area = [505, 512, 617, 720, 919][h % 5];
  const off = `${200 + (h % 700)}-${String(1000 + ((h >> 3) % 9000)).padStart(4, "0")}`;
  const mob = `${300 + ((h >> 5) % 600)}-${String(1000 + ((h >> 7) % 9000)).padStart(4, "0")}`;
  const ext = 1100 + (h % 40);
  return { office: `+1 (${area}) ${off} ext. ${ext}`, mobile: `+1 (${area}) ${mob}` };
}

function Field({
  label,
  value,
  required,
  disabled,
}: {
  label: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-[13px] ${
        disabled ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-300 text-slate-700"
      }`}
    >
      <span className={value ? "text-slate-800" : "text-slate-400"}>
        {value ?? label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <ChevronDownIcon className="size-4 shrink-0 text-slate-400" />
    </div>
  );
}

/**
 * A simulated Outreach "task" side panel — the working screen a rep sees once a
 * prospect is in a sequence and the step is due: ready to call or email right
 * now. Visual mock only (no real Outreach integration); uses Outreach's own
 * dark header + indigo accent so it reads as a separate product.
 *
 * Every pushed contact/lead is one task. The "N of M" pager walks through them;
 * "Log … & complete" advances to the next and, on the last, returns the rep to
 * Today's Worklist. The header X closes at any time (also back to the worklist).
 */
export function OutreachProspectPanel({
  prospects,
  sequence,
  onClose,
}: {
  prospects: OutreachProspect[];
  sequence: string;
  onClose: () => void;
}) {
  const count = prospects.length;
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"call" | "email">("call");
  const [phoneChoice, setPhoneChoice] = useState(0);

  const p = prospects[Math.min(index, count - 1)];
  const phones = mockPhones(p.name);
  const email = p.email ?? null;
  const indigo = "#5b5bd6";

  function complete() {
    if (index < count - 1) {
      setIndex(index + 1);
      setPhoneChoice(0);
    } else {
      onClose();
    }
  }

  return (
    // Non-modal, docked right: the app stays usable behind it; closes only on the
    // explicit X / footer controls (never on an outside click).
    <div className="pointer-events-none fixed inset-0 z-[100] flex justify-end">
      <div
        role="dialog"
        aria-label="Outreach task"
        className="pointer-events-auto relative flex h-full w-full max-w-[400px] flex-col bg-white text-slate-800 shadow-2xl duration-200 animate-in fade-in-0 slide-in-from-right-8"
      >
        {/* Dark Outreach header with the N-of-M pager */}
        <div className="flex items-center gap-2 bg-[#15163a] px-3 py-2.5 text-white">
          <button
            onClick={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            aria-label="Previous task"
            className="flex size-6 items-center justify-center rounded hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="text-[13px] font-medium tabular-nums">
            {index + 1} of {count}
          </span>
          <button
            onClick={() => setIndex(Math.min(count - 1, index + 1))}
            disabled={index >= count - 1}
            aria-label="Next task"
            className="flex size-6 items-center justify-center rounded hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          <div className="flex-1" />
          <SettingsIcon className="size-4 text-white/70" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-6 items-center justify-center rounded hover:bg-white/10"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Task summary */}
          <div className="border-b border-slate-200 px-4 pt-3 pb-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-500">
                  {mode === "call" ? "Call" : "Email"}
                </div>
                <div className="truncate text-[16px] font-bold text-slate-900">{p.name}</div>
                <div className="truncate text-[12.5px] text-slate-500">
                  {[p.title, p.company].filter(Boolean).join(" • ") || p.kind || "Contact"}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-slate-600">
                  <SendIcon className="size-3.5 shrink-0" style={{ color: indigo }} />
                  Step #1 of {sequence}
                </div>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
                {initials(p.name)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-400">
                <ShieldIcon className="size-4" />
                <LinkIcon className="size-4" />
                <CloudIcon className="size-4" />
              </div>
              <div className="flex items-center gap-1 text-[12.5px] font-semibold text-rose-500">
                <ClockIcon className="size-4" />
                Due now
              </div>
            </div>
          </div>

          {/* Tabs (visual) */}
          <div className="flex items-center gap-4 border-b border-slate-200 px-4 text-[13px]">
            {["Task", "Activity", "Prospect", "Account"].map((t) => (
              <span
                key={t}
                className={`-mb-px border-b-2 py-2.5 ${
                  t === "Task"
                    ? "border-[#5b5bd6] font-semibold text-[#5b5bd6]"
                    : "border-transparent text-slate-500"
                }`}
              >
                {t}
              </span>
            ))}
            <div className="flex-1" />
            <PlusIcon className="size-4 text-slate-400" />
          </div>

          <div className="px-4 py-3">
            <div className="mb-3 text-[12.5px] text-slate-600">
              Please De-Dupe before calling{" "}
              <span className="font-semibold" style={{ color: indigo }}>
                Expand
              </span>
            </div>

            {/* Call / Email toggle — the step is ready either way */}
            <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-0.5 text-[13px]">
              <button
                onClick={() => setMode("call")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${
                  mode === "call" ? "bg-[#5b5bd6] text-white" : "text-slate-600"
                }`}
              >
                <PhoneIcon className="size-3.5" /> Call
              </button>
              <button
                onClick={() => setMode("email")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold ${
                  mode === "email" ? "bg-[#5b5bd6] text-white" : "text-slate-600"
                }`}
              >
                <MailIcon className="size-3.5" /> Email
              </button>
            </div>

            {mode === "call" ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-[12.5px] font-medium text-slate-500">
                    Prospect’s phone number:
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: "office", label: phones.office },
                      { icon: "mobile", label: phones.mobile },
                    ].map((row, i) => (
                      <button
                        key={i}
                        onClick={() => setPhoneChoice(i)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                          phoneChoice === i ? "border-[#5b5bd6] bg-[#f6f6fe]" : "border-slate-200"
                        }`}
                      >
                        <span
                          className={`flex size-4 items-center justify-center rounded-full border ${
                            phoneChoice === i ? "border-[#5b5bd6]" : "border-slate-300"
                          }`}
                        >
                          {phoneChoice === i && (
                            <span className="size-2 rounded-full bg-[#5b5bd6]" />
                          )}
                        </span>
                        <PhoneIcon className="size-4 text-slate-400" />
                        <span className="flex-1 text-[13px] tabular-nums text-slate-700">
                          {row.label}
                        </span>
                        <PhoneIcon className="size-4" style={{ color: indigo }} />
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Associate opportunity" />

                <div className="rounded-md border border-slate-300 px-3 py-1.5">
                  <div className="text-[10.5px] text-slate-400">Your phone number</div>
                  <div className="text-[13px] text-slate-700">Use a Local Number</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Call Disposition" required />
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <div className="text-[10.5px] text-slate-400">Sequence action</div>
                    <div className="text-[13px] text-slate-500">Automatic</div>
                  </div>
                </div>

                <Field label="Call Purpose" />

                <textarea
                  rows={3}
                  placeholder="Call notes"
                  className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />

                <input
                  placeholder="Tags"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-[12.5px] font-medium text-slate-500">
                    Prospect’s email:
                  </div>
                  <div className="flex w-full items-center gap-3 rounded-lg border border-[#5b5bd6] bg-[#f6f6fe] px-3 py-2">
                    <MailIcon className="size-4 text-slate-400" />
                    <span className="flex-1 truncate text-[13px] text-slate-700">
                      {email ?? "No email on file"}
                    </span>
                    <SendIcon className="size-4" style={{ color: indigo }} />
                  </div>
                </div>

                <Field label="Associate opportunity" />

                <div className="rounded-md border border-slate-300 px-3 py-1.5">
                  <div className="text-[10.5px] text-slate-400">Subject</div>
                  <div className="text-[13px] text-slate-700">
                    Quick question, {p.name.split(" ")[0]}
                  </div>
                </div>

                <textarea
                  rows={4}
                  defaultValue={`Hi ${p.name.split(" ")[0]},\n\nSaw ${p.company ?? "your team"} is scaling finance — worth a quick look at how Sage Intacct fits?`}
                  className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email Purpose" />
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <div className="text-[10.5px] text-slate-400">Sequence action</div>
                    <div className="text-[13px] text-slate-500">Automatic</div>
                  </div>
                </div>

                <input
                  placeholder="Tags"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer — complete advances to the next task; last one returns to the worklist */}
        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
          <button
            onClick={complete}
            className="flex-1 rounded-full bg-[#5b5bd6] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:brightness-110"
          >
            {mode === "call" ? "Log call & complete" : "Send email & complete"}
            {count > 1 && index < count - 1 ? " → next" : ""}
          </button>
          <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">
            <PhoneIcon className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
