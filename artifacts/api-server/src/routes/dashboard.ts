import { Router } from "express";
import { db, appointmentsTable, incomesTable } from "@workspace/db";
import { gte, lte, and, eq } from "drizzle-orm";

const router = Router();

function getDateRange(offsetDays: number, rangeDays: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - rangeDays + 1);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

router.get("/", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  
  // Get all incomes for different periods
  const [todayIncomes, weekIncomes, monthIncomes] = await Promise.all([
    db.select().from(incomesTable).where(eq(incomesTable.date, today)),
    db.select().from(incomesTable).where(and(gte(incomesTable.date, weekStartStr), lte(incomesTable.date, today))),
    db.select().from(incomesTable).where(and(gte(incomesTable.date, monthStartStr), lte(incomesTable.date, today))),
  ]);
  
  // Get appointments for different periods
  const [todayAppts, weekAppts, monthAppts, upcomingAppts] = await Promise.all([
    db.select().from(appointmentsTable).where(and(eq(appointmentsTable.date, today))),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, weekStartStr), lte(appointmentsTable.date, today))),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, monthStartStr), lte(appointmentsTable.date, today))),
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, today), eq(appointmentsTable.status, "confirmed"))).limit(10),
  ]);
  
  const todayRevenue = todayIncomes.reduce((s, i) => s + parseFloat(i.amount), 0);
  const weekRevenue = weekIncomes.reduce((s, i) => s + parseFloat(i.amount), 0);
  const monthRevenue = monthIncomes.reduce((s, i) => s + parseFloat(i.amount), 0);
  
  const completedMonthAppts = monthAppts.filter(a => a.status === "completed");
  const averageTicket = completedMonthAppts.length > 0 ? monthRevenue / completedMonthAppts.length : 0;
  
  // Top services
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
  
  // Monthly revenue (last 6 months)
  const monthlyData: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
    monthlyData[key] = 0;
  }
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const allIncomes = await db.select().from(incomesTable).where(gte(incomesTable.date, sixMonthsAgo.toISOString().split("T")[0]));
  allIncomes.forEach(income => {
    const d = new Date(income.date);
    const key = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
    if (key in monthlyData) monthlyData[key] += parseFloat(income.amount);
  });
  
  res.json({
    todayRevenue,
    weekRevenue,
    monthRevenue,
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
    monthlyRevenue: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
  });
});

export default router;
