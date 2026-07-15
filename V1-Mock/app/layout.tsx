import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { DemoUserSwitcher } from "@/components/layout/demo-user-switcher";
import { ProductSwitcher } from "@/components/layout/product-switcher";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { DEMO_USER_COOKIE, getDemoUser } from "@/lib/auth/demo-user";
import { PRODUCT_COOKIE, getCurrentProduct } from "@/lib/products";
import { TEAM_COOKIE, getCurrentTeam } from "@/lib/teams";

// Sage's brand typefaces (Sage Headline / Sage Text) are proprietary; the
// brand guide's own fallback stack for both is Helvetica Neue, Helvetica,
// Roboto, or Segoe UI / Arial. We use Roboto for both, varying weight only.
const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dedupe Engine",
  description: "Instant Salesforce account workability checks",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const currentUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const currentProduct = getCurrentProduct(cookieStore.get(PRODUCT_COOKIE)?.value);
  const currentTeam = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`dark ${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-white/10 bg-black">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-1.5 font-heading font-black">
              <span className="text-primary">●</span>
              <span>Dedupe Engine</span>
            </Link>
            <div className="flex items-center gap-3">
              <ProductSwitcher currentProduct={currentProduct} />
              <TeamSwitcher currentTeam={currentTeam} />
              <DemoUserSwitcher currentUserId={currentUser.id} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
