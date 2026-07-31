import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientWriteData, formatClient } from "@/lib/client-format";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const body = (await request.json()) as Parameters<typeof clientWriteData>[0] & {
      name: string;
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
    }

    const created = await prisma.client.create({
      data: {
        userId: authz.userId,
        name,
        ...clientWriteData(body),
      },
    });

    await prisma.userProfile.upsert({
      where: { userId: authz.userId },
      create: { userId: authz.userId, activeClientId: created.id },
      update: { activeClientId: created.id },
    });

    return NextResponse.json(formatClient(created));
  } catch {
    return NextResponse.json({ error: "Cliente duplicado ou invalido." }, { status: 400 });
  }
}
