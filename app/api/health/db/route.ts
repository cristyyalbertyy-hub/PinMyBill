import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseDbTarget(urlRaw: string | undefined) {
  if (!urlRaw) {
    return {
      hasUrl: false,
      host: null as string | null,
      provider: "missing" as "missing" | "local" | "neon" | "remote",
    };
  }
  try {
    const parsed = new URL(urlRaw);
    const host = parsed.hostname || null;
    const lowerHost = (host ?? "").toLowerCase();
    const provider =
      lowerHost === "localhost" || lowerHost === "127.0.0.1"
        ? "local"
        : lowerHost.includes("neon.tech")
          ? "neon"
          : "remote";
    return { hasUrl: true, host, provider };
  } catch {
    return {
      hasUrl: true,
      host: null as string | null,
      provider: "remote" as "missing" | "local" | "neon" | "remote",
    };
  }
}

export async function GET() {
  const dbTarget = parseDbTarget(process.env.DATABASE_URL);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: dbTarget,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: dbTarget,
        error: "Falha de ligacao a base de dados.",
      },
      { status: 500 },
    );
  }
}
