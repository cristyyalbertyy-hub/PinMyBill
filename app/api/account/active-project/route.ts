import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: authz.userId },
      select: { activeClientId: true },
    });
    return NextResponse.json({ activeClientId: profile?.activeClientId ?? null });
  } catch {
    return NextResponse.json({ error: "Falha ao ler projecto activo." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as { activeClientId?: string | null };
    const activeClientId = body.activeClientId ?? null;

    if (activeClientId) {
      const owned = await prisma.client.findFirst({
        where: { id: activeClientId, userId: authz.userId },
      });
      if (!owned) {
        return NextResponse.json({ error: "Projecto nao encontrado." }, { status: 404 });
      }
    }

    await prisma.userProfile.upsert({
      where: { userId: authz.userId },
      create: { userId: authz.userId, activeClientId },
      update: { activeClientId },
    });

    return NextResponse.json({ ok: true, activeClientId });
  } catch {
    return NextResponse.json({ error: "Falha ao guardar projecto activo." }, { status: 500 });
  }
}
