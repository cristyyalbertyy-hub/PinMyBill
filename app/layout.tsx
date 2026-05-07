import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import {
  DAY_BG_STORAGE_KEY,
  DAY_OVERLAY_COLOR_KEY,
  DAY_OVERLAY_OPACITY_KEY,
  DAY_THEME_STYLE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";
import { InstructionsFrame } from "@/components/instructions-frame";
import { Providers } from "@/components/providers";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pin-my-bill.vercel.app"),
  title: {
    default: "PinMyBill · Beta",
    template: "%s · PinMyBill Beta",
  },
  description:
    "Capture receipts on your phone, keep history tidy, export PDF or CSV — fast, multilingual, built for real workflows (Beta).",
  applicationName: "PinMyBill Beta",
  appleWebApp: {
    capable: true,
    title: "PinMyBill Beta",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icons/pin.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/pin.svg", type: "image/svg+xml" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootstrap = `(function(){try{var p=window.location.pathname;if(p==="/login"||p==="/register"){var d0=document.documentElement;d0.classList.add("dark");d0.style.colorScheme="dark";d0.removeAttribute("data-day-bg");d0.removeAttribute("data-day-theme-style");d0.style.removeProperty("--pin-day-overlay-rgb");d0.style.removeProperty("--pin-day-overlay-opacity");return;}var k=${JSON.stringify(THEME_STORAGE_KEY)},bk=${JSON.stringify(DAY_BG_STORAGE_KEY)},ck=${JSON.stringify(DAY_OVERLAY_COLOR_KEY)},ok=${JSON.stringify(DAY_OVERLAY_OPACITY_KEY)},tk=${JSON.stringify(DAY_THEME_STYLE_KEY)},s=localStorage.getItem(k),m=window.matchMedia("(prefers-color-scheme: dark)").matches,n=s==="night"||(s!=="day"&&s!=="night"&&m),d=document.documentElement,bv=localStorage.getItem(bk),cv=localStorage.getItem(ck),ov=Number(localStorage.getItem(ok)),tv=localStorage.getItem(tk);d.classList.toggle("dark",n);d.style.colorScheme=n?"dark":"light";if(n){d.removeAttribute("data-day-bg");d.removeAttribute("data-day-theme-style");d.style.removeProperty("--pin-day-overlay-rgb");d.style.removeProperty("--pin-day-overlay-opacity");}else{if(bv==="soft-orange"||bv==="soft-sky"||bv==="soft-canary"||bv==="soft-green"||bv==="vivid-orange"||bv==="vivid-sky"||bv==="vivid-canary"||bv==="vivid-green")d.setAttribute("data-day-bg",bv);else d.removeAttribute("data-day-bg");if(tv==="almond-blossom")d.setAttribute("data-day-theme-style",tv);else d.setAttribute("data-day-theme-style","default");if(/^#[0-9a-f]{6}$/i.test(cv||"")){var h=(cv||"").slice(1),r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);d.style.setProperty("--pin-day-overlay-rgb",r+" "+g+" "+b);}if(!Number.isNaN(ov))d.style.setProperty("--pin-day-overlay-opacity",String(Math.min(1,Math.max(0,ov))));}}catch(e){}})();`;

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="pin-app min-h-full flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Script id="pin-theme-init" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
        <Script id="pin-sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); }); }`}
        </Script>
        <Providers>
          <InstructionsFrame>{children}</InstructionsFrame>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
