import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExpenseType, ExpenseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, context: Params) {
  try {
    const { code } = await context.params;
    const decoded = decodeURIComponent(code);
    const body = (await request.json()) as Partial<{
      merchant: string;
      amount: number;
      currency: string;
      date: string;
      type: ExpenseType;
      category: string;
      clientName: string | null;
      status: ExpenseStatus;
      receiptImageUrl: string | null;
    }>;

    const data: Record<string, unknown> = {};
    if (body.merchant !== undefined) data.merchant = body.merchant;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.type !== undefined) data.type = body.type;
    if (body.category !== undefined) data.category = body.category;
    if (body.clientName !== undefined) data.clientName = body.clientName;
    if (body.status !== undefined) data.status = body.status;
    if (body.receiptImageUrl !== undefined) data.receiptImageUrl = body.receiptImageUrl;

    const updated = await prisma.expense.update({
      where: { code: decoded },
      data,
    });

    return NextResponse.json({
      id: updated.code,
      merchant: updated.merchant,
      amount: Number(updated.amount),
      currency: updated.currency,
      date: updated.date.toISOString().slice(0, 10),
      type: updated.type,
      category: updated.category,
      clientName: updated.clientName ?? undefined,
      status: updated.status,
      receiptImageUrl: updated.receiptImageUrl ?? undefined,
    });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar despesa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const { code } = await context.params;
    const decoded = decodeURIComponent(code);
    await prisma.expense.delete({ where: { code: decoded } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao remover despesa." }, { status: 500 });
  }
}
