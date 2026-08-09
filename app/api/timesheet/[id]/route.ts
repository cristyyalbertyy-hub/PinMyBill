import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { countDaysInclusive, isIsoDate } from "@/lib/timesheet-utils";

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
      endDate?: string | null;
      days?: number;
      rate?: number;
      currency?: string;
    };

    const owned = await prisma.timesheetEntry.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const workDate =
      body.workDate !== undefined
        ? body.workDate
        : owned.workDate.toISOString().slice(0, 10);

    const data: Record<string, unknown> = {};

    if (body.workDate !== undefined) data.workDate = new Date(body.workDate);
    if (body.rate !== undefined) data.rate = body.rate;
    if (body.currency !== undefined) data.currency = body.currency.trim().toUpperCase();

    if (body.endDate !== undefined) {
      if (body.endDate === null || body.endDate === "") {
        data.description = null;
        data.days = body.days ?? 1;
      } else if (isIsoDate(body.endDate)) {
        const days = countDaysInclusive(workDate, body.endDate);
        if (days <= 0) {
          return NextResponse.json({ error: "Intervalo de datas invalido." }, { status: 400 });
        }
        data.description = body.endDate;
        data.days = days;
      } else {
        return NextResponse.json({ error: "Data final invalida." }, { status: 400 });
      }
    } else if (body.days !== undefined) {
      data.days = body.days;
      data.description = null;
    }

    await prisma.timesheetEntry.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar entrada." }, { status: 500 });
  }
}
