import { Router } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const services = await db.select().from(servicesTable).orderBy(servicesTable.name);
  res.json(services.map(s => ({
    ...s,
    price: parseFloat(s.price),
    createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const { name, description, price, durationMinutes } = req.body;
  const [service] = await db.insert(servicesTable).values({
    name,
    description: description || null,
    price: price.toString(),
    durationMinutes: durationMinutes || 60,
  }).returning();
  res.status(201).json({
    ...service,
    price: parseFloat(service.price),
    createdAt: service.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!service) return res.status(404).json({ error: "Service not found" });
  res.json({ ...service, price: parseFloat(service.price), createdAt: service.createdAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, price, durationMinutes } = req.body;
  const [service] = await db.update(servicesTable).set({
    name,
    description: description || null,
    price: price.toString(),
    durationMinutes,
  }).where(eq(servicesTable.id, id)).returning();
  if (!service) return res.status(404).json({ error: "Service not found" });
  res.json({ ...service, price: parseFloat(service.price), createdAt: service.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.status(204).send();
});

export default router;
