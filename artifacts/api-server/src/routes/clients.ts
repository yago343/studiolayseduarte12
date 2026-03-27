import { Router } from "express";
import { db, clientsTable, appointmentsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  
  const clientsWithStats = await Promise.all(clients.map(async (client) => {
    const appts = await db.select().from(appointmentsTable)
      .where(eq(appointmentsTable.clientId, client.id))
      .orderBy(desc(appointmentsTable.date));
    return {
      ...client,
      createdAt: client.createdAt.toISOString(),
      totalAppointments: appts.length,
      lastAppointment: appts[0]?.date || null,
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
