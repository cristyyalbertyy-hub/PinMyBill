import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function formatClient(row: {
  id: string;
  name: string;
  startDate: Date | null;
  projectDirector: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    projectDirector: row.projectDirector,
    address: row.address,
    email: row.email,
    phone: row.phone,
  };
}

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const rows = await prisma.client.findMany({
      where: { userId: authz.userId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(rows.map(formatClient));
  } catch {
    return NextResponse.json({ error: "Falha ao ler clientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as {
      name: string;
      startDate?: string;
      projectDirector?: string;
      address?: string;
      email?: string;
      phone?: string;
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }

    const created = await prisma.client.create({
      data: {
        userId: authz.userId,
        name,
        startDate: body.startDate ? new Date(body.startDate) : null,
        projectDirector: body.projectDirector?.trim() || null,
        address: body.address?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
      },
    });
    return NextResponse.json(formatClient(created));
  } catch {
    return NextResponse.json({ error: "Cliente duplicado ou invalido." }, { status: 400 });
  }
}
