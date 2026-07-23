"use client";

import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  XIcon,
  ZapIcon,
  ClockIcon,
  CheckCircle2Icon,
  Building2Icon,
  SparklesIcon,
  ArrowUpIcon,
  ListChecksIcon,
  SendHorizontalIcon,
} from "lucide-react";

export interface OutreachProspect {
  name: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
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

/**
 * A simulated Outreach "prospect profile" side panel — the screen Outreach
 * slides in when prospects are added to a sequence. This is a visual mock (no
 * real Outreach integration): it uses Outreach's own light theme and indigo
 * accent rather than the app's tokens, so it reads as a separate product. Every
 * pushed contact is listed; email is derived when unknown. Closing dismisses
 * the panel and leaves the rep on the current page.
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
  const many = count > 1;
  const company = prospects.find((p) => p.company)?.company ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Dim the app behind the drawer; click to dismiss. */}
      <div
        className="absolute inset-0 bg-black/30 data-open:animate-in data-open:fade-in-0"
        data-open=""
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-label="Outreach prospect"
        className="relative flex h-full w-full max-w-[400px] flex-col bg-white text-slate-800 shadow-2xl duration-200 animate-in fade-in-0 slide-in-from-right-8"
      >
        {/* Outreach top chrome */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-2 text-slate-500">
          <MenuIcon className="size-4" />
          <div className="ml-1 flex min-w-0 items-center gap-1 text-[13px]">
            <span className="text-slate-400">Prospects</span>
            <span className="text-slate-300">/</span>
            <span className="truncate font-medium text-slate-700">
              {many ? `${count} added` : prospects[0]?.name}
            </span>
          </div>
          <div className="flex-1" />
          <SearchIcon className="size-4" />
          <BellIcon className="size-4" />
          <PhoneIcon className="size-4" />
          <MailIcon className="size-4" />
          <CalendarIcon className="size-4" />
          <span className="ml-0.5 flex size-6 items-center justify-center rounded-full bg-[#5b5bd6] text-white">
            <ZapIcon className="size-3.5" />
          </span>
          <button
            onClick={onClose}
            className="ml-1 flex size-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Confirmation of the action that opened this panel */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700">
            <CheckCircle2Icon className="size-4 shrink-0" />
            {count} {count === 1 ? "prospect" : "prospects"} added to “{sequence}”
          </div>

          <div className="mb-2 text-[13px] font-semibold text-slate-700">
            {many ? "Prospects" : "Profile ▾"}
          </div>

          {/* One identity block per pushed contact */}
          <div className="mb-3 divide-y divide-slate-100">
            {prospects.map((p) => (
              <div key={p.name} className="flex items-start gap-3 py-2.5 first:pt-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-600">
                  {initials(p.name)}
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-900">{p.name}</div>
                  {[p.company, p.title].filter(Boolean).length > 0 && (
                    <div className="text-[12.5px] text-slate-500">
                      {[p.company, p.title].filter(Boolean).join(" • ")}
                    </div>
                  )}
                  {p.email ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[#5b5bd6]">
                      <MailIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-400">
                      <MailIcon className="size-3.5 shrink-0" />
                      No email on file
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add to sequence + quick actions */}
          <div className="mb-3 flex items-center gap-2">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5b5bd6] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110">
              <SendHorizontalIcon className="size-4" />
              Add to sequence
            </button>
            <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
              <MailIcon className="size-4" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
              <CalendarIcon className="size-4" />
            </span>
          </div>

          {/* Kaia-style ask box */}
          <div className="mb-4 rounded-xl border border-[#c9c9f2] bg-[#f6f6fe] p-3">
            <div className="text-[12.5px] text-slate-400">
              Ask a question about the prospect’s account
            </div>
            <div className="mt-3 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 text-[12px]">
                <SparklesIcon className="size-3.5" /> 1
              </span>
              <span className="flex size-6 items-center justify-center rounded-full border border-slate-300">
                <ArrowUpIcon className="size-3.5" />
              </span>
            </div>
          </div>

          {/* Activity */}
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-400 uppercase">
            Activity
          </div>
          <div className="mb-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <SendHorizontalIcon className="size-4 shrink-0 text-slate-400" />
              <span>
                {many ? `${count} prospects active in` : "Active in"}{" "}
                <span className="font-medium text-[#5b5bd6]">1 sequence</span>
                <span className="block text-[11.5px] text-slate-400">{sequence}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <ListChecksIcon className="size-4 shrink-0 text-slate-400" />
              <span className="font-medium text-[#5b5bd6]">
                {count} active {count === 1 ? "task" : "tasks"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <ClockIcon className="size-4 shrink-0 text-slate-400" />
              <span className="text-slate-600">Touched just now</span>
            </div>
          </div>

          {/* Account */}
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-400 uppercase">
            Account
          </div>
          <div className="mb-4 flex items-center gap-2 text-[13px]">
            <Building2Icon className="size-4 shrink-0 text-slate-400" />
            <span className="text-[#5b5bd6]">{company ?? "—"}</span>
          </div>

          {/* Open opportunities */}
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-400 uppercase">
            Open opportunities
          </div>
          <div className="text-[13px] text-slate-400">No opportunities</div>
        </div>

        {/* Footer — dismiss and stay on the page */}
        <div className="border-t border-slate-200 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
