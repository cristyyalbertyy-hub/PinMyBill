import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function formatRow(row: {
  id: string;
  clientName: string;
  workDate: Date;
  days: { toNumber(): number };
  rate: { toNumber(): number };
  currency: string;
  description: string | null;
}) {
  return {
    id: row.id,
    clientName: row.clientName,
    workDate: row.workDate.toISOString().slice(0, 10),
    days: row.days.toNumber(),
    rate: row.rate.toNumber(),
    currency: row.currency,
    description: row.description,
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
      days: number;
      rate: number;
      currency: string;
      description?: string;
    };

    const clientName = body.clientName?.trim();
    if (!clientName || !body.workDate) {
      return NextResponse.json({ error: "Cliente e data obrigatorios." }, { status: 400 });
    }

    const days = Number(body.days);
    const rate = Number(body.rate);
    if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(rate) || rate < 0) {
      return NextResponse.json({ error: "Dias e rate invalidos." }, { status: 400 });
    }

    const created = await prisma.timesheetEntry.create({
      data: {
        userId: authz.userId,
        clientName,
        workDate: new Date(body.workDate),
        days,
        rate,
        currency: body.currency?.trim().toUpperCase() || "EUR",
        description: body.description?.trim() || null,
      },
    });
    return NextResponse.json(formatRow(created));
  } catch {
    return NextResponse.json({ error: "Falha ao criar entrada." }, { status: 500 });
  }
}
