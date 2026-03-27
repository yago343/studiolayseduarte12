import { Router } from "express";
import { db, incomesTable, expensesTable, appointmentsTable } from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";

const router = Router();

function formatIncome(i: any) {
  return { ...i, amount: parseFloat(i.amount), createdAt: i.createdAt.toISOString() };
}
function formatExpense(e: any) {
  return { ...e, amount: parseFloat(e.amount), createdAt: e.createdAt.toISOString() };
}

// Incomes
router.get("/incomes", async (req, res) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (startDate) conditions.push(gte(incomesTable.date, startDate));
  if (endDate) conditions.push(lte(incomesTable.date, endDate));
  
  const incomes = conditions.length > 0
    ? await db.select().from(incomesTable).where(and(...conditions)).orderBy(incomesTable.date)
    : await db.select().from(incomesTable).orderBy(incomesTable.date);
  res.json(incomes.map(formatIncome));
});

router.post("/incomes", async (req, res) => {
  const { appointmentId, serviceName, amount, paymentMethod, date, clientName } = req.body;
  const [income] = await db.insert(incomesTable).values({
    appointmentId: appointmentId || null,
    serviceName,
    amount: amount.toString(),
    paymentMethod,
    date,
    clientName: clientName || null,
  }).returning();
  res.status(201).json(formatIncome(income));
});

router.delete("/incomes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(incomesTable).where(eq(incomesTable.id, id));
  res.status(204).send();
});

// Expenses
router.get("/expenses", async (req, res) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  let conditions: any[] = [];
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  
  const expenses = conditions.length > 0
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(expensesTable.date)
    : await db.select().from(expensesTable).orderBy(expensesTable.date);
  res.json(expenses.map(formatExpense));
});

router.post("/expenses", async (req, res) => {
  const { description, amount, category, date } = req.body;
  const [expense] = await db.insert(expensesTable).values({
    description,
    amount: amount.toString(),
    category,
    date,
  }).returning();
  res.status(201).json(formatExpense(expense));
});

router.delete("/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.status(204).send();
});

// Financial summary
router.get("/summary", async (req, res) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  let incomeConditions: any[] = [];
  let expenseConditions: any[] = [];
  
  if (startDate) {
    incomeConditions.push(gte(incomesTable.date, startDate));
    expenseConditions.push(gte(expensesTable.date, startDate));
  }
  if (endDate) {
    incomeConditions.push(lte(incomesTable.date, endDate));
    expenseConditions.push(lte(expensesTable.date, endDate));
  }
  
  const incomes = incomeConditions.length > 0
    ? await db.select().from(incomesTable).where(and(...incomeConditions))
    : await db.select().from(incomesTable);
  
  const expenses = expenseConditions.length > 0
    ? await db.select().from(expensesTable).where(and(...expenseConditions))
    : await db.select().from(expensesTable);
  
  const totalIncome = incomes.reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  
  const incomeByPaymentMethod = { pix: 0, cash: 0, card: 0 };
  incomes.forEach(i => {
    const method = i.paymentMethod as "pix" | "cash" | "card";
    if (method in incomeByPaymentMethod) incomeByPaymentMethod[method] += parseFloat(i.amount);
  });
  
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount);
  });
  
  const dailyRevenue: Record<string, number> = {};
  incomes.forEach(i => {
    dailyRevenue[i.date] = (dailyRevenue[i.date] || 0) + parseFloat(i.amount);
  });
  
  res.json({
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeByPaymentMethod,
    expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })),
    dailyRevenue: Object.entries(dailyRevenue).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => ({ date, amount })),
  });
});

export default router;
