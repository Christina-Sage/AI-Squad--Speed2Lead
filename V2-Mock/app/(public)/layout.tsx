import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Public, prospect-facing surface for the lead-capture form. Deliberately
// separate from the internal SDR dashboard chrome — no team/priority/user
// switchers, no worklist nav. It shares the app shell and the database, so a
// submitted lead still lands in the dashboard's SDR list.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 px-6 py-3.5">
          <span className="flex items-center gap-2 font-heading text-[16px] font-black whitespace-nowrap">
            <span className="inline-block size-[9px] rounded-full bg-primary" />
            <span>Sage</span>
          </span>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            Lead capture
          </span>
          <span className="flex-1" />
          <Link
            href="/"
            className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
          >
            SDR dashboard <ArrowUpRight className="size-3.5" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pt-8 pb-24">{children}</main>
      <footer className="mx-auto w-full max-w-[860px] px-6 pb-10 text-[11.5px] text-muted-foreground">
        AI Squad prototype · This form is a standalone lead-capture surface. Submissions are scored
        and created as leads in the SDR worklist on the WorkIt dashboard.
      </footer>
    </>
  );
}
