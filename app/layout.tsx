import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
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
  title: {
    default: "PinMyBill · Beta",
    template: "%s · PinMyBill Beta",
  },
  description: "Smart receipt management for personal and business use (Beta).",
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
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="pin-app min-h-full flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Providers>
          <InstructionsFrame>{children}</InstructionsFrame>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
