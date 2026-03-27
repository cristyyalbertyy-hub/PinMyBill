export type ExpenseType = "pessoal" | "empresa" | "cliente";
export type CurrencyCode = string;

export type ExpenseItem = {
  id: string;
  merchant: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  type: ExpenseType;
  category: string;
  clientName?: string;
  status: "processado" | "rever";
  receiptImageUrl?: string;
};

export const expenseItems: ExpenseItem[] = [
  {
    id: "R-1001",
    merchant: "Nusr-Et Dubai",
    amount: 460,
    currency: "AED",
    date: "2026-03-22",
    type: "empresa",
    category: "Restaurante",
    status: "processado",
  },
  {
    id: "R-1002",
    merchant: "Careem",
    amount: 78,
    currency: "AED",
    date: "2026-03-22",
    type: "empresa",
    category: "Transporte",
    status: "processado",
  },
  {
    id: "R-1003",
    merchant: "Sephora",
    amount: 240,
    currency: "QAR",
    date: "2026-03-20",
    type: "pessoal",
    category: "Compras pessoais",
    status: "rever",
  },
  {
    id: "R-1004",
    merchant: "West Bay Limousine",
    amount: 150,
    currency: "QAR",
    date: "2026-03-21",
    type: "cliente",
    category: "Despesa reembolsavel",
    clientName: "Al Noor Events",
    status: "rever",
  },
];

export const categories = {
  pessoal: ["Alimentacao", "Saude", "Compras pessoais", "Lazer"],
  empresa: ["Restaurante", "Hotel", "Transporte", "Material de evento"],
  cliente: ["Despesa reembolsavel", "Transporte cliente", "Refeicao cliente"],
};

export const clients = ["Al Noor Events", "Doha Premium Weddings"];
