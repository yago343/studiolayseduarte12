import { Router } from "express";
import { db, clientsTable, appointmentsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

function toDateStr(d: any): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function calcFrequency(appts: any[]) {
  const confirmed = appts.filter(a => a.status !== "cancelled");
  const total = confirmed.length;
  if (total === 0) return { label: "Sem visitas", percent: 0, avgIntervalDays: null, visitsLast30: 0, visitsLast90: 0 };

  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);

  const visitsLast30 = confirmed.filter(a => new Date(toDateStr(a.date)) >= thirtyDaysAgo).length;
  const visitsLast90 = confirmed.filter(a => new Date(toDateStr(a.date)) >= ninetyDaysAgo).length;

  // Average interval between visits
  let avgIntervalDays: number | null = null;
  if (total >= 2) {
    const dates = confirmed.map(a => new Date(toDateStr(a.date)).getTime()).sort((x, y) => x - y);
    const intervals = [];
    for (let i = 1; i < dates.length; i++) intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    avgIntervalDays = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
  }

  // Frequency per month (using last 90 days window)
  const perMonth = (visitsLast90 / 3); // visits per month in last 90 days
  const percent = Math.min(100, Math.round(perMonth * 50)); // 2/month = 100%
  const label = perMonth >= 1.5 ? "Alta" : perMonth >= 0.5 ? "Média" : "Baixa";

  return { label, percent, avgIntervalDays, visitsLast30, visitsLast90 };
}

router.get("/", async (req, res) => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  
  const clientsWithStats = await Promise.all(clients.map(async (client) => {
    const appts = await db.select().from(appointmentsTable)
      .where(eq(appointmentsTable.clientId, client.id))
      .orderBy(desc(appointmentsTable.date));
    const freq = calcFrequency(appts);
    return {
      ...client,
      createdAt: client.createdAt.toISOString(),
      totalAppointments: appts.filter(a => a.status !== "cancelled").length,
      lastAppointment: appts[0] ? toDateStr(appts[0].date) : null,
      frequencyLabel: freq.label,
      frequencyPercent: freq.percent,
      avgIntervalDays: freq.avgIntervalDays,
      visitsLast30: freq.visitsLast30,
      visitsLast90: freq.visitsLast90,
    };
  }));
  
  res.json(clientsWithStats);
});

router.post("/", async (req, res) => {
  const { name, phone, email } = req.body;
  const [client] = await db.insert(clientsTable).values({ name, phone, email }).returning();
  res.status(201).json({ ...client, createdAt: client.createdAt.toISOString(), totalAppointments: 0, lastAppointment: null });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) return res.status(404).json({ error: "Client not found" });
  
  const appointments = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.clientId, id))
    .orderBy(desc(appointmentsTable.date));
  
  res.json({
    ...client,
    createdAt: client.createdAt.toISOString(),
    appointments: appointments.map(a => ({
      ...a,
      servicePrice: parseFloat(a.servicePrice),
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, email } = req.body;
  const [client] = await db.update(clientsTable).set({ name, phone, email }).where(eq(clientsTable.id, id)).returning();
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json({ ...client, createdAt: client.createdAt.toISOString(), totalAppointments: 0 });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.status(204).send();
});

export default router;
