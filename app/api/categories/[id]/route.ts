import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { name: string };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }
    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json({ id: updated.id, name: updated.name, scope: updated.scope });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar categoria." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao apagar categoria." }, { status: 500 });
  }
}
