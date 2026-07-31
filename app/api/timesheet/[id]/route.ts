import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;
    const owned = await prisma.timesheetEntry.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await prisma.timesheetEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao apagar entrada." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      workDate?: string;
      days?: number;
      rate?: number;
      currency?: string;
      description?: string | null;
    };

    const owned = await prisma.timesheetEntry.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.workDate !== undefined) data.workDate = new Date(body.workDate);
    if (body.days !== undefined) data.days = body.days;
    if (body.rate !== undefined) data.rate = body.rate;
    if (body.currency !== undefined) data.currency = body.currency.trim().toUpperCase();
    if (body.description !== undefined) data.description = body.description?.trim() || null;

    await prisma.timesheetEntry.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar entrada." }, { status: 500 });
  }
}
