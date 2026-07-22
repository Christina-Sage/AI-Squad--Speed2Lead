import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DemoUserSwitcher } from "@/components/layout/demo-user-switcher";
import { PrioritySwitcher } from "@/components/layout/priority-switcher";
import { ProductSwitcher } from "@/components/layout/product-switcher";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DEMO_USER_COOKIE, getDemoUser } from "@/lib/auth/demo-user";
import { PRIORITY_COOKIE, getCurrentPriority } from "@/lib/priority";
import { PRODUCT_COOKIE, getCurrentProduct } from "@/lib/products";
import { TEAM_COOKIE, getCurrentTeam } from "@/lib/teams";

const BUSINESS_CASES: [string, string][] = [
  ["#1 De-dupe — “Can I work it?”", "Workability verdict incl. duplicate-account detection (compact checklist)."],
  ["#2 Scoring — “Should I work it?”", "Fit + Intent + Workability score and the ranked home worklist."],
  ["#3 Push to Outreach", "Sequence push with revenue & growth signals on the Work-it page."],
  ["#4 Contacts & data hygiene", "Found ICP contacts → add to SFDC; suggested field updates."],
];

// Internal SDR tool chrome: header, team/priority/product/user switchers, and
// the business-case footer. The public lead-capture form (/simulate) lives in a
// separate route group and deliberately does not render any of this.
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const currentUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const currentProduct = getCurrentProduct(cookieStore.get(PRODUCT_COOKIE)?.value);
  const currentTeam = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);
  const currentPriority = getCurrentPriority(cookieStore.get(PRIORITY_COOKIE)?.value);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex items-center gap-5 px-7 py-3">
          <Link href="/" className="flex items-center gap-2 font-heading text-[15px] font-black whitespace-nowrap">
            <span className="inline-block size-[9px] rounded-full bg-primary" />
            <span>WorkIt</span>
          </Link>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            AI Squad Prototype
          </span>
          <span className="flex-1" />
          <div className="flex items-center gap-3">
            <Link
              href="/simulate"
              className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Lead form <ArrowUpRight className="size-3.5" />
            </Link>
            <ProductSwitcher currentProduct={currentProduct} />
            <TeamSwitcher currentTeam={currentTeam} />
            {currentTeam === "SDR" && <PrioritySwitcher currentPriority={currentPriority} />}
            <DemoUserSwitcher currentUserId={currentUser.id} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 pt-7 pb-20">{children}</main>
      <footer className="mx-auto w-full max-w-[1080px] px-6 pb-10 text-xs text-muted-foreground">
        <b className="text-foreground">Business-case coverage in this prototype</b>
        <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BUSINESS_CASES.map(([title, body]) => (
            <div key={title} className="rounded-[10px] border border-border bg-card px-3 py-2.5">
              <b className="mb-0.5 block text-[11.5px] text-foreground">{title}</b>
              {body}
            </div>
          ))}
        </div>
      </footer>
    </>
  );
}
