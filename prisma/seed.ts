import { PrismaClient, CategoryScope, ExpenseType, ExpenseStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categoryData: { scope: CategoryScope; name: string }[] = [
    { scope: "pessoal", name: "Alimentacao" },
    { scope: "pessoal", name: "Saude" },
    { scope: "pessoal", name: "Compras pessoais" },
    { scope: "pessoal", name: "Lazer" },
    { scope: "empresa", name: "Restaurante" },
    { scope: "empresa", name: "Hotel" },
    { scope: "empresa", name: "Transporte" },
    { scope: "empresa", name: "Material de evento" },
    { scope: "cliente", name: "Despesa reembolsavel" },
    { scope: "cliente", name: "Transporte cliente" },
    { scope: "cliente", name: "Refeicao cliente" },
  ];

  for (const row of categoryData) {
    try {
      await prisma.category.create({
        data: { ...row, userId: null },
      });
    } catch {
      /* duplicate or constraint */
    }
  }

  const clientNames = ["Al Noor Events", "Doha Premium Weddings"];
  for (const name of clientNames) {
    try {
      await prisma.client.create({
        data: { name, userId: null },
      });
    } catch {
      /* duplicate */
    }
  }

  const expenses = [
    {
      code: "R-1001",
      merchant: "Nusr-Et Dubai",
      amount: 460,
      currency: "AED",
      date: new Date("2026-03-22"),
      type: "empresa" as ExpenseType,
      category: "Restaurante",
      clientName: null,
      status: "processado" as ExpenseStatus,
      receiptImageUrl: null,
    },
    {
      code: "R-1002",
      merchant: "Careem",
      amount: 78,
      currency: "AED",
      date: new Date("2026-03-22"),
      type: "empresa" as ExpenseType,
      category: "Transporte",
      clientName: null,
      status: "processado" as ExpenseStatus,
      receiptImageUrl: null,
    },
    {
      code: "R-1003",
      merchant: "Sephora",
      amount: 240,
      currency: "QAR",
      date: new Date("2026-03-20"),
      type: "pessoal" as ExpenseType,
      category: "Compras pessoais",
      clientName: null,
      status: "rever" as ExpenseStatus,
      receiptImageUrl: null,
    },
    {
      code: "R-1004",
      merchant: "West Bay Limousine",
      amount: 150,
      currency: "QAR",
      date: new Date("2026-03-21"),
      type: "cliente" as ExpenseType,
      category: "Despesa reembolsavel",
      clientName: "Al Noor Events",
      status: "rever" as ExpenseStatus,
      receiptImageUrl: null,
    },
  ];

  for (const e of expenses) {
    await prisma.expense.upsert({
      where: { code: e.code },
      create: { ...e, userId: null },
      update: {
        merchant: e.merchant,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        type: e.type,
        category: e.category,
        clientName: e.clientName,
        status: e.status,
        receiptImageUrl: e.receiptImageUrl,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
