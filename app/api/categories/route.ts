import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CategoryScope } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const rows = await prisma.category.findMany({ orderBy: [{ scope: "asc" }, { name: "asc" }] });
    const grouped = {
      pessoal: [] as { id: string; name: string }[],
      empresa: [] as { id: string; name: string }[],
      cliente: [] as { id: string; name: string }[],
    };
    for (const r of rows) {
      const scope = r.scope.toLowerCase() as keyof typeof grouped;
      grouped[scope].push({ id: r.id, name: r.name });
    }
    return NextResponse.json(grouped);
  } catch {
    return NextResponse.json({ error: "Falha ao ler categorias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scope: CategoryScope; name: string };
    const name = body.name?.trim();
    if (!name || !body.scope) {
      return NextResponse.json({ error: "Nome e ambito obrigatorios." }, { status: 400 });
    }
    const created = await prisma.category.create({
      data: { scope: body.scope, name },
    });
    return NextResponse.json({ id: created.id, name: created.name, scope: created.scope });
  } catch {
    return NextResponse.json({ error: "Categoria duplicada ou invalida." }, { status: 400 });
  }
}
