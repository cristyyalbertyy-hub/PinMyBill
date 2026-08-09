import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { computeTotalHours } from "@/lib/timesheet-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function formatRow(row: {
  id: string;
  clientName: string;
  workDate: Date;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  days: { toNumber(): number };
  rate: { toNumber(): number };
  currency: string;
}) {
  return {
    id: row.id,
    clientName: row.clientName,
    workDate: row.workDate.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    breakMinutes: row.breakMinutes,
    totalHours: row.days.toNumber(),
    rate: row.rate.toNumber(),
    currency: row.currency,
  };
}

export async function GET(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  const { searchParams } = new URL(request.url);
  const clientName = searchParams.get("client")?.trim();

  try {
    const rows = await prisma.timesheetEntry.findMany({
      where: {
        userId: authz.userId,
        ...(clientName ? { clientName } : {}),
      },
      orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(rows.map(formatRow));
  } catch {
    return NextResponse.json({ error: "Falha ao ler timesheet." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as {
      clientName: string;
      workDate: string;
      startTime?: string;
      endTime?: string;
      breakMinutes?: number;
      rate: number;
      currency: string;
    };

    const clientName = body.clientName?.trim();
    if (!clientName || !body.workDate) {
      return NextResponse.json({ error: "Cliente e data obrigatorios." }, { status: 400 });
    }

    const startTime = body.startTime?.trim() || "09:00";
    const endTime = body.endTime?.trim() || "17:00";
    const breakMinutes = Math.max(0, Number(body.breakMinutes) || 0);
    const rate = Number(body.rate);
    const totalHours = computeTotalHours(startTime, endTime, breakMinutes);
    const currency = body.currency?.trim().toUpperCase() ?? "";

    if (!Number.isFinite(rate) || rate < 0) {
      return NextResponse.json({ error: "Rate invalida." }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: "Moeda obrigatoria." }, { status: 400 });
    }
    if (totalHours <= 0) {
      return NextResponse.json({ error: "Horas invalidas." }, { status: 400 });
    }

    const created = await prisma.timesheetEntry.create({
      data: {
        userId: authz.userId,
        clientName,
        workDate: new Date(body.workDate),
        startTime,
        endTime,
        breakMinutes,
        days: totalHours,
        rate,
        currency,
      },
    });
    return NextResponse.json(formatRow(created));
  } catch {
    return NextResponse.json({ error: "Falha ao criar entrada." }, { status: 500 });
  }
}
