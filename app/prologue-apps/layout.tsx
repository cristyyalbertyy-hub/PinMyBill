import type { Metadata } from "next";
import { PrologueLocaleProvider } from "@/lib/prologue-i18n/context";
import "./prologue.css";

export const metadata: Metadata = {
  title: "Prologue Apps",
  description:
    "Prologue digital tools for collaborators — download apps built for Events, Learning and more.",
  openGraph: {
    title: "Prologue Apps",
    description: "Apps for the Prologue team. The first one is here — many more on the way.",
    images: [{ url: "/brand/prologue-logo.png" }],
  },
};

export default function PrologueAppsLayout({ children }: { children: React.ReactNode }) {
  return <PrologueLocaleProvider>{children}</PrologueLocaleProvider>;
}
