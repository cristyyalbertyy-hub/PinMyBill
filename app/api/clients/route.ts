import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.client.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(rows.map((r) => ({ id: r.id, name: r.name })));
  } catch {
    return NextResponse.json({ error: "Falha ao ler clientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name: string };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }
    const created = await prisma.client.create({ data: { name } });
    return NextResponse.json({ id: created.id, name: created.name });
  } catch {
    return NextResponse.json({ error: "Cliente duplicado ou invalido." }, { status: 400 });
  }
}
