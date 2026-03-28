import { Router } from "express";
import { db, appointmentsTable, servicesTable, incomesTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";

const router = Router();

function formatDate(d: any): string {
  if (!d) return d;
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function formatAppt(a: any) {
  return {
    ...a,
    date: formatDate(a.date),
    servicePrice: parseFloat(a.servicePrice),
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const { startDate, endDate, status } = req.query as Record<string, string>;
  
  let conditions: any[] = [];
  if (startDate) conditions.push(gte(appointmentsTable.date, startDate));
  if (endDate) conditions.push(lte(appointmentsTable.date, endDate));
  if (status) conditions.push(eq(appointmentsTable.status, status));
  
  const appts = conditions.length > 0
    ? await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(appointmentsTable.date, appointmentsTable.startTime)
    : await db.select().from(appointmentsTable).orderBy(appointmentsTable.date, appointmentsTable.startTime);
  
  res.json(appts.map(formatAppt));
});

router.post("/", async (req, res) => {
  const { clientId, clientName, clientPhone, serviceId, date, startTime, notes, status } = req.body;
  
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
  if (!service) return res.status(404).json({ error: "Service not found" });
  
  // Calculate end time
  const [h, m] = startTime.split(":").map(Number);
  const totalMins = h * 60 + m + service.durationMinutes;
  const endTime = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
  
  const [appt] = await db.insert(appointmentsTable).values({
    clientId: clientId || null,
    clientName,
    clientPhone: clientPhone || null,
    serviceId,
    serviceName: service.name,
    servicePrice: service.price,
    date,
    startTime,
    endTime,
    status: status || "confirmed",
    notes: notes || null,
  }).returning();
  
  res.status(201).json(formatAppt(appt));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  res.json(formatAppt(appt));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { clientId, clientName, clientPhone, serviceId, date, startTime, notes, status, paymentMethod } = req.body;
  
  let serviceName, servicePrice, endTime;
  if (serviceId) {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
    if (!service) return res.status(404).json({ error: "Service not found" });
    serviceName = service.name;
    servicePrice = service.price;
    if (startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const totalMins = h * 60 + m + service.durationMinutes;
      endTime = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
    }
  }
  
  const updateData: any = {};
  if (clientId !== undefined) updateData.clientId = clientId;
  if (clientName) updateData.clientName = clientName;
  if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
  if (serviceId) updateData.serviceId = serviceId;
  if (serviceName) updateData.serviceName = serviceName;
  if (servicePrice) updateData.servicePrice = servicePrice;
  if (date) updateData.date = date;
  if (startTime) updateData.startTime = startTime;
  if (endTime) updateData.endTime = endTime;
  if (notes !== undefined) updateData.notes = notes;
  if (status) updateData.status = status;
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
  
  const [appt] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, id)).returning();
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  res.json(formatAppt(appt));
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, paymentMethod, paymentStatus } = req.body;

  const [appt] = await db.update(appointmentsTable).set({ status, paymentMethod: paymentMethod || null })
    .where(eq(appointmentsTable.id, id)).returning();
  if (!appt) return res.status(404).json({ error: "Appointment not found" });

  // Auto-create income record when completing (paid or pending)
  if (status === "completed") {
    const existingIncome = await db.select().from(incomesTable).where(eq(incomesTable.appointmentId, id));
    if (existingIncome.length === 0) {
      const isPending = paymentStatus === "pending" || (!paymentMethod);
      await db.insert(incomesTable).values({
        appointmentId: id,
        serviceName: appt.serviceName,
        amount: appt.servicePrice,
        paymentMethod: isPending ? null : paymentMethod,
        paymentStatus: isPending ? "pending" : "paid",
        date: appt.date,
        clientName: appt.clientName,
      });
    }
  }

  res.json(formatAppt(appt));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));
  res.status(204).send();
});

export default router;
