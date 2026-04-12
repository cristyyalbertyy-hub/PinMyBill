import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  const [expenses, categories, clients] = await Promise.all([
    prisma.expense.count({ where: { userId: null } }),
    prisma.category.count({ where: { userId: null } }),
    prisma.client.count({ where: { userId: null } }),
  ]);

  return NextResponse.json({
    hasLegacy: expenses + categories + clients > 0,
    counts: { expenses, categories, clients },
  });
}
