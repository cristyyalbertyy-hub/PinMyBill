import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";

/** Associa todos os registos sem userId à conta atual (dados criados antes do login). */
export async function POST() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  const { userId } = authz;

  const [exp, cat, cli] = await prisma.$transaction([
    prisma.expense.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.category.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.client.updateMany({ where: { userId: null }, data: { userId } }),
  ]);

  return NextResponse.json({
    ok: true,
    updated: {
      expenses: exp.count,
      categories: cat.count,
      clients: cli.count,
    },
  });
}
