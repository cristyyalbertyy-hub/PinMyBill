import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import type { CategoryScope, ExpenseStatus, ExpenseType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type BackupExpense = {
  code: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  type: ExpenseType;
  category: string;
  clientName?: string | null;
  status: ExpenseStatus;
  receiptImageUrl?: string | null;
};

type BackupPayload = {
  version: 1;
  exportedAt: string;
  categories: { scope: CategoryScope; name: string }[];
  clients: { name: string }[];
  expenses: BackupExpense[];
};

function normalizeBackupPayload(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (v.version !== 1) return null;
  if (!Array.isArray(v.categories) || !Array.isArray(v.clients) || !Array.isArray(v.expenses)) return null;
  return {
    version: 1,
    exportedAt: typeof v.exportedAt === "string" ? v.exportedAt : new Date().toISOString(),
    categories: v.categories
      .filter((c): c is { scope: CategoryScope; name: string } => {
        if (!c || typeof c !== "object") return false;
        const x = c as Record<string, unknown>;
        return (
          (x.scope === "pessoal" || x.scope === "empresa" || x.scope === "cliente") &&
          typeof x.name === "string" &&
          x.name.trim().length > 0
        );
      })
      .map((c) => ({ scope: c.scope, name: c.name.trim() })),
    clients: v.clients
      .filter((c): c is { name: string } => {
        if (!c || typeof c !== "object") return false;
        const x = c as Record<string, unknown>;
        return typeof x.name === "string" && x.name.trim().length > 0;
      })
      .map((c) => ({ name: c.name.trim() })),
    expenses: v.expenses
      .filter((e): e is BackupExpense => {
        if (!e || typeof e !== "object") return false;
        const x = e as Record<string, unknown>;
        return (
          typeof x.code === "string" &&
          typeof x.merchant === "string" &&
          typeof x.amount === "number" &&
          typeof x.currency === "string" &&
          typeof x.date === "string" &&
          (x.type === "pessoal" || x.type === "empresa" || x.type === "cliente") &&
          typeof x.category === "string" &&
          (x.status === "rever" || x.status === "processado")
        );
      })
      .map((e) => ({
        ...e,
        merchant: e.merchant.trim(),
        currency: e.currency.trim(),
        category: e.category.trim(),
        clientName: typeof e.clientName === "string" ? e.clientName.trim() : null,
        receiptImageUrl: typeof e.receiptImageUrl === "string" ? e.receiptImageUrl : null,
      })),
  };
}

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const [categories, clients, expenses] = await Promise.all([
      prisma.category.findMany({
        where: { userId: authz.userId },
        select: { scope: true, name: true },
        orderBy: [{ scope: "asc" }, { name: "asc" }],
      }),
      prisma.client.findMany({
        where: { userId: authz.userId },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.expense.findMany({
        where: { userId: authz.userId },
        orderBy: [{ date: "desc" }, { code: "desc" }],
      }),
    ]);

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories,
      clients,
      expenses: expenses.map((e) => ({
        code: e.code,
        merchant: e.merchant,
        amount: Number(e.amount),
        currency: e.currency,
        date: e.date.toISOString().slice(0, 10),
        type: e.type,
        category: e.category,
        clientName: e.clientName,
        status: e.status,
        receiptImageUrl: e.receiptImageUrl,
      })),
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Falha ao exportar backup." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as { replace?: boolean; backup?: unknown };
    if (!body.replace) {
      return NextResponse.json({ error: "Modo de restauracao invalido." }, { status: 400 });
    }
    const payload = normalizeBackupPayload(body.backup);
    if (!payload) {
      return NextResponse.json({ error: "Ficheiro de backup invalido." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({ where: { userId: authz.userId } });
      await tx.category.deleteMany({ where: { userId: authz.userId } });
      await tx.client.deleteMany({ where: { userId: authz.userId } });

      if (payload.categories.length > 0) {
        await tx.category.createMany({
          data: payload.categories.map((c) => ({
            userId: authz.userId,
            scope: c.scope,
            name: c.name,
          })),
          skipDuplicates: true,
        });
      }
      if (payload.clients.length > 0) {
        await tx.client.createMany({
          data: payload.clients.map((c) => ({
            userId: authz.userId,
            name: c.name,
          })),
          skipDuplicates: true,
        });
      }
      if (payload.expenses.length > 0) {
        await tx.expense.createMany({
          data: payload.expenses.map((e) => ({
            code: e.code,
            userId: authz.userId,
            merchant: e.merchant,
            amount: e.amount,
            currency: e.currency,
            date: new Date(e.date),
            type: e.type,
            category: e.category,
            clientName: e.clientName ?? null,
            status: e.status,
            receiptImageUrl: e.receiptImageUrl ?? null,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao restaurar backup." }, { status: 500 });
  }
}
