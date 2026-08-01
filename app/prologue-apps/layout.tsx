import type { Metadata } from "next";
import "./prologue.css";

export const metadata: Metadata = {
  title: "Prologue Apps",
  description:
    "Ferramentas digitais Prologue para colaboradores — descarrega apps feitas para Events, School e muito mais.",
  openGraph: {
    title: "Prologue Apps",
    description: "Apps para a equipa Prologue. A primeira já está aqui — muitas mais a caminho.",
    images: [{ url: "/brand/prologue-logo.png" }],
  },
};

export default function PrologueAppsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
