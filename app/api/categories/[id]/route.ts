import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import type { ExpenseType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { name: string };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: { id, userId: authz.userId },
      select: { name: true, scope: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 });
    }

    const oldName = existing.name;
    const scope = existing.scope.toLowerCase() as ExpenseType;

    await prisma.$transaction([
      prisma.category.update({
        where: { id },
        data: { name },
      }),
      prisma.expense.updateMany({
        where: {
          userId: authz.userId,
          category: oldName,
          type: scope,
        },
        data: { category: name },
      }),
    ]);

    return NextResponse.json({ id, name, scope: existing.scope });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar categoria." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;

    const existing = await prisma.category.findFirst({
      where: { id, userId: authz.userId },
      select: { name: true, scope: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 });
    }

    const scope = existing.scope.toLowerCase() as ExpenseType;
    const inUse = await prisma.expense.count({
      where: {
        userId: authz.userId,
        category: existing.name,
        type: scope,
      },
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          error:
            "Categoria em uso. Primeiro reatribui as despesas para outra categoria e depois apaga.",
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao apagar categoria." }, { status: 500 });
  }
}
