import { Router } from "express";
import { db, imagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const images = await db.select().from(imagesTable).orderBy(imagesTable.createdAt);
  res.json(images.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { url, title, description, category } = req.body;
  const [image] = await db.insert(imagesTable).values({
    url,
    title: title || null,
    description: description || null,
    category: category || "portfolio",
  }).returning();
  res.status(201).json({ ...image, createdAt: image.createdAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { url, title, description, category } = req.body;
  const [image] = await db.update(imagesTable).set({ url, title, description, category })
    .where(eq(imagesTable.id, id)).returning();
  if (!image) return res.status(404).json({ error: "Image not found" });
  res.json({ ...image, createdAt: image.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(imagesTable).where(eq(imagesTable.id, id));
  res.status(204).send();
});

export default router;
