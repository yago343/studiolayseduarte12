import { Router } from "express";
import { db, appointmentsTable, incomesTable, expensesTable } from "@workspace/db";
import { gte, lte, and, eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [todayIncomes, weekIncomes, monthIncomes, allIncomes, todayAppts, weekAppts, monthAppts, upcomingAppts, monthExpenses] = await Promise.all([
    db.select().from(incomesTable).where(eq(incomesTable.date, today)),
    db.select().from(incomesTable).where(and(gte(incomesTable.date, weekStartStr), lte(incomesTable.date, today))),
    db.select().from(incomesTable).where(and(gte(incomesTable.date, monthStartStr), lte(incomesTable.date, today))),
    db.select().from(incomesTable).where(gte(incomesTable.date, sixMonthsAgo.toISOString().split("T")[0])),
    db.select().from(appointmentsTable).where(eq(appointmentsTable.date, today)),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, weekStartStr), lte(appointmentsTable.date, today))),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, monthStartStr), lte(appointmentsTable.date, today))),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, today), eq(appointmentsTable.status, "confirmed"))).limit(10),
    db.select().from(expensesTable).where(and(gte(expensesTable.date, monthStartStr), lte(expensesTable.date, today))),
  ]);

  const paidOnly = (arr: any[]) => arr.filter(i => (i.paymentStatus ?? "paid") === "paid");
  const todayRevenue = paidOnly(todayIncomes).reduce((s, i) => s + parseFloat(i.amount), 0);
  const weekRevenue = paidOnly(weekIncomes).reduce((s, i) => s + parseFloat(i.amount), 0);
  const monthRevenue = paidOnly(monthIncomes).reduce((s, i) => s + parseFloat(i.amount), 0);
  const monthPending = monthIncomes.filter(i => i.paymentStatus === "pending").reduce((s, i) => s + parseFloat(i.amount), 0);
  const monthExpensesTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  const completedMonthAppts = monthAppts.filter(a => a.status === "completed");
  const averageTicket = completedMonthAppts.length > 0 ? monthRevenue / completedMonthAppts.length : 0;

  // Top services (month)
  const serviceCount: Record<string, { count: number; revenue: number }> = {};
  monthAppts.filter(a => a.status === "completed").forEach(a => {
    if (!serviceCount[a.serviceName]) serviceCount[a.serviceName] = { count: 0, revenue: 0 };
    serviceCount[a.serviceName].count++;
    serviceCount[a.serviceName].revenue += parseFloat(a.servicePrice);
  });
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([serviceName, data]) => ({ serviceName, ...data }));

  // Daily revenue — hourly buckets for today (completed appointments by startTime hour)
  const hourlyData: Record<string, number> = {};
  for (let h = 7; h <= 20; h++) {
    hourlyData[`${String(h).padStart(2, "0")}h`] = 0;
  }
  todayIncomes.forEach(income => {
    // Match income to today's appointments by amount to find approximate hour
    // Since incomes don't have time, we'll use completed appointments startTime
  });
  // Use completed today's appointments for hourly breakdown
  todayAppts.filter(a => a.status === "completed").forEach(a => {
    const hour = parseInt((a.startTime || "00:00").split(":")[0], 10);
    const key = `${String(hour).padStart(2, "0")}h`;
    if (key in hourlyData) {
      hourlyData[key] += parseFloat(a.servicePrice);
    }
  });
  const dailyRevenue = Object.entries(hourlyData).map(([hour, amount]) => ({ label: hour, amount }));

  // Weekly revenue — one entry per day for last 7 days
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weeklyData: { label: string; date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    weeklyData.push({ label: dayNames[d.getDay()], date: dateStr, amount: 0 });
  }
  weekIncomes.forEach(income => {
    const entry = weeklyData.find(w => w.date === income.date);
    if (entry) entry.amount += parseFloat(income.amount);
  });

  // Monthly revenue — last 6 months
  const now = new Date();
  const monthlyData: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
    monthlyData[key] = 0;
  }
  allIncomes.forEach(income => {
    const d = new Date(income.date);
    const key = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
    if (key in monthlyData) monthlyData[key] += parseFloat(income.amount);
  });

  res.json({
    todayRevenue,
    weekRevenue,
    monthRevenue,
    monthPending,
    monthExpenses: monthExpensesTotal,
    netProfit: monthRevenue - monthExpensesTotal,
    todayAppointments: todayAppts.filter(a => a.status !== "cancelled").length,
    weekAppointments: weekAppts.filter(a => a.status !== "cancelled").length,
    monthAppointments: monthAppts.filter(a => a.status !== "cancelled").length,
    averageTicket,
    upcomingAppointments: upcomingAppts.map(a => ({
      ...a,
      date: typeof a.date === "string" ? a.date.slice(0, 10) : a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10),
      servicePrice: parseFloat(a.servicePrice),
      createdAt: a.createdAt.toISOString(),
    })),
    topServices,
    dailyRevenue,
    weeklyRevenue: weeklyData.map(({ label, amount }) => ({ label, amount })),
    monthlyRevenue: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
  });
});

export default router;
