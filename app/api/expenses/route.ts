import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import type { ExpenseType, ExpenseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
/** Plano Pro: até 60s; Hobby continua limitado pelo Vercel (~10s). */
export const maxDuration = 60;

function serializeExpense(e: {
  code: string;
  merchant: string;
  amount: unknown;
  currency: string;
  date: Date;
  type: ExpenseType;
  category: string;
  clientName: string | null;
  status: ExpenseStatus;
  receiptImageUrl: string | null;
}) {
  return {
    id: e.code,
    merchant: e.merchant,
    amount: Number(e.amount),
    currency: e.currency,
    date: e.date.toISOString().slice(0, 10),
    type: e.type,
    category: e.category,
    clientName: e.clientName ?? undefined,
    status: e.status,
    receiptImageUrl: e.receiptImageUrl ?? undefined,
  };
}

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const list = await prisma.expense.findMany({
      where: { userId: authz.userId },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(list.map(serializeExpense));
  } catch {
    return NextResponse.json({ error: "Falha ao ler despesas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as {
      merchant: string;
      amount: number;
      currency: string;
      date?: string;
      type: ExpenseType;
      category: string;
      clientName?: string | null;
      status?: ExpenseStatus;
      receiptImageUrl?: string | null;
    };

    const code = `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const date = body.date ? new Date(body.date) : new Date();

    const created = await prisma.expense.create({
      data: {
        code,
        userId: authz.userId,
        merchant: body.merchant,
        amount: body.amount,
        currency: body.currency,
        date,
        type: body.type,
        category: body.category,
        clientName: body.clientName ?? null,
        status: body.status ?? "rever",
        receiptImageUrl: body.receiptImageUrl ?? null,
      },
    });

    return NextResponse.json(serializeExpense(created));
  } catch {
    return NextResponse.json({ error: "Falha ao criar despesa." }, { status: 500 });
  }
}
