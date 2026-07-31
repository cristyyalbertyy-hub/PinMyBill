import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientWriteData, formatClient } from "@/lib/client-format";
import { requireUserId } from "@/lib/require-user";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Parameters<typeof clientWriteData>[0];

    const owned = await prisma.client.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: clientWriteData(body),
    });
    return NextResponse.json(formatClient(updated));
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar cliente." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;

    const owned = await prisma.client.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await prisma.client.delete({ where: { id } });

    const profile = await prisma.userProfile.findUnique({
      where: { userId: authz.userId },
    });
    if (profile?.activeClientId === id) {
      const fallback = await prisma.client.findFirst({
        where: { userId: authz.userId },
        orderBy: { name: "asc" },
      });
      await prisma.userProfile.update({
        where: { userId: authz.userId },
        data: { activeClientId: fallback?.id ?? null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao apagar cliente." }, { status: 500 });
  }
}
