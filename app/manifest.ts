import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PinMyBill (Beta)",
    short_name: "PinMyBill",
    description: "Gestao inteligente de recibos pessoais e de empresa — versao Beta.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    background_color: "#faf7f2",
    theme_color: "#0d9488",
    orientation: "portrait-primary",
    lang: "pt",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/pin.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/pin.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
