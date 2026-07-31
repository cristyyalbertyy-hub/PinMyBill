import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      startDate?: string | null;
      projectDirector?: string | null;
      address?: string | null;
      email?: string | null;
      phone?: string | null;
    };

    const owned = await prisma.client.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 });
      }
      data.name = name;
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.projectDirector !== undefined) {
      data.projectDirector = body.projectDirector?.trim() || null;
    }
    if (body.address !== undefined) {
      data.address = body.address?.trim() || null;
    }
    if (body.email !== undefined) {
      data.email = body.email?.trim() || null;
    }
    if (body.phone !== undefined) {
      data.phone = body.phone?.trim() || null;
    }

    const updated = await prisma.client.update({
      where: { id },
      data,
    });
    return NextResponse.json(formatClient(updated));
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar cliente." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const { id } = await context.params;

    const owned = await prisma.client.findFirst({
      where: { id, userId: authz.userId },
    });
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao apagar cliente." }, { status: 500 });
  }
}
