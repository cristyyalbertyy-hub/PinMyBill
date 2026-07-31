import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const row = await prisma.userProfile.findUnique({
      where: { userId: authz.userId },
    });
    if (!row) {
      return NextResponse.json({
        fromName: "",
        fromAddress: "",
        fromEmail: "",
        fromPhone: "",
        projectDirector: "",
        bank: {
          accountName: "",
          bankName: "",
          accountNo: "",
          iban: "",
          swift: "",
          currency: "",
        },
      });
    }
    return NextResponse.json({
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      fromEmail: row.fromEmail,
      fromPhone: row.fromPhone,
      projectDirector: row.projectDirector,
      bank: {
        accountName: row.bankAccountName,
        bankName: row.bankName,
        accountNo: row.bankAccountNo,
        iban: row.bankIban,
        swift: row.bankSwift,
        currency: row.bankCurrency,
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao ler perfil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;

  try {
    const body = (await request.json()) as {
      fromName?: string;
      fromAddress?: string;
      fromEmail?: string;
      fromPhone?: string;
      projectDirector?: string;
      bank?: {
        accountName?: string;
        bankName?: string;
        accountNo?: string;
        iban?: string;
        swift?: string;
        currency?: string;
      };
    };

    const bank = body.bank ?? {};
    const data = {
      fromName: body.fromName?.trim() ?? "",
      fromAddress: body.fromAddress?.trim() ?? "",
      fromEmail: body.fromEmail?.trim() ?? "",
      fromPhone: body.fromPhone?.trim() ?? "",
      projectDirector: body.projectDirector?.trim() ?? "",
      bankAccountName: bank.accountName?.trim() ?? "",
      bankName: bank.bankName?.trim() ?? "",
      bankAccountNo: bank.accountNo?.trim() ?? "",
      bankIban: bank.iban?.trim() ?? "",
      bankSwift: bank.swift?.trim() ?? "",
      bankCurrency: bank.currency?.trim() ?? "",
    };

    await prisma.userProfile.upsert({
      where: { userId: authz.userId },
      create: { userId: authz.userId, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao guardar perfil." }, { status: 500 });
  }
}
