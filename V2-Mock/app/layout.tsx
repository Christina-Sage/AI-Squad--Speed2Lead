import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toaster";

// Sage brand typefaces, extracted from the prototype's embedded @font-face
// data (licensed to Sage). Sage Text carries body copy; Sage Headline is the
// 900-weight display face used for headings.
const sageText = localFont({
  variable: "--font-sage-text",
  src: [
    { path: "./fonts/SageText-400.otf", weight: "400", style: "normal" },
    { path: "./fonts/SageText-400-italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/SageText-700.otf", weight: "700", style: "normal" },
  ],
});

const sageHeadline = localFont({
  variable: "--font-sage-headline",
  src: [{ path: "./fonts/SageHeadline-900.otf", weight: "900", style: "normal" }],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkIt — AI Squad Prototype",
  description: "Instant Salesforce account workability checks",
};

// Applied before hydration so the stored (or OS-preferred) theme doesn't flash.
const THEME_INIT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Root shell only: <html>/<body>, fonts, theme init, and toasts. The internal
// dashboard chrome lives in (dashboard)/layout; the public lead form lives in
// (public)/layout — two separate surfaces that share this shell and the DB.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sageText.variable} ${sageHeadline.variable} ${robotoMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-sm text-foreground">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
