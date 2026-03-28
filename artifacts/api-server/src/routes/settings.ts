import { Router } from "express";
import { db, settingsTable, workingHoursTable, servicesTable, clientsTable, appointmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

async function ensureDefaults() {
  // Ensure settings exist
  const existing = await db.select().from(settingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(settingsTable).values({
      studioName: "Studio Layse Duarte",
      primaryColor: "#e91e8c",
      welcomeMessage: "Bem-vinda ao Studio Layse Duarte! Agende seu horário com facilidade.",
      bookingMessage: "Confirme seu agendamento e prepare-se para se sentir linda!",
    });
  }
  
  // Ensure working hours exist
  const wh = await db.select().from(workingHoursTable);
  if (wh.length === 0) {
    for (let i = 0; i < 7; i++) {
      await db.insert(workingHoursTable).values({
        dayOfWeek: i,
        dayName: DAY_NAMES[i],
        isOpen: i === 0 ? "false" : "true",
        openTime: "09:00",
        closeTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      });
    }
  }
}

// Settings
function serializeSettings(s: any) {
  return {
    studioName: s.studioName,
    primaryColor: s.primaryColor,
    welcomeMessage: s.welcomeMessage,
    bookingMessage: s.bookingMessage,
    adminLogoUrl: s.adminLogoUrl || null,
    publicLogoUrl: s.publicLogoUrl || null,
  };
}

router.get("/settings", async (req, res) => {
  await ensureDefaults();
  const [settings] = await db.select().from(settingsTable).limit(1);
  res.json(serializeSettings(settings));
});

router.put("/settings", async (req, res) => {
  await ensureDefaults();
  const { studioName, primaryColor, welcomeMessage, bookingMessage, adminLogoUrl, publicLogoUrl } = req.body;
  const existing = await db.select().from(settingsTable).limit(1);
  
  let settings;
  if (existing.length > 0) {
    [settings] = await db.update(settingsTable).set({
      studioName: studioName || existing[0].studioName,
      primaryColor: primaryColor || existing[0].primaryColor,
      welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : existing[0].welcomeMessage,
      bookingMessage: bookingMessage !== undefined ? bookingMessage : existing[0].bookingMessage,
      adminLogoUrl: adminLogoUrl !== undefined ? adminLogoUrl : existing[0].adminLogoUrl,
      publicLogoUrl: publicLogoUrl !== undefined ? publicLogoUrl : existing[0].publicLogoUrl,
    }).where(eq(settingsTable.id, existing[0].id)).returning();
  } else {
    [settings] = await db.insert(settingsTable).values({ studioName, primaryColor, welcomeMessage, bookingMessage, adminLogoUrl, publicLogoUrl }).returning();
  }
  res.json(serializeSettings(settings));
});

// Working hours
router.get("/schedule", async (req, res) => {
  await ensureDefaults();
  const hours = await db.select().from(workingHoursTable).orderBy(workingHoursTable.dayOfWeek);
  res.json(hours.map(h => ({
    ...h,
    isOpen: h.isOpen === "true",
  })));
});

router.put("/schedule", async (req, res) => {
  await ensureDefaults();
  const updates = req.body as Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    breakStart?: string;
    breakEnd?: string;
  }>;
  
  const results = [];
  for (const update of updates) {
    const existing = await db.select().from(workingHoursTable).where(eq(workingHoursTable.dayOfWeek, update.dayOfWeek));
    if (existing.length > 0) {
      const [updated] = await db.update(workingHoursTable).set({
        isOpen: update.isOpen ? "true" : "false",
        openTime: update.openTime || null,
        closeTime: update.closeTime || null,
        breakStart: update.breakStart || null,
        breakEnd: update.breakEnd || null,
      }).where(eq(workingHoursTable.id, existing[0].id)).returning();
      results.push({ ...updated, isOpen: updated.isOpen === "true" });
    } else {
      const [created] = await db.insert(workingHoursTable).values({
        dayOfWeek: update.dayOfWeek,
        dayName: DAY_NAMES[update.dayOfWeek],
        isOpen: update.isOpen ? "true" : "false",
        openTime: update.openTime || null,
        closeTime: update.closeTime || null,
        breakStart: update.breakStart || null,
        breakEnd: update.breakEnd || null,
      }).returning();
      results.push({ ...created, isOpen: created.isOpen === "true" });
    }
  }
  res.json(results);
});

// Availability
router.get("/availability", async (req, res) => {
  const { date, serviceId, serviceIds } = req.query as Record<string, string>;
  if (!date || (!serviceId && !serviceIds)) return res.status(400).json({ error: "date and serviceId (or serviceIds) required" });
  
  await ensureDefaults();
  
  // Parse date parts directly to avoid timezone issues
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();
  
  const [wh] = await db.select().from(workingHoursTable).where(eq(workingHoursTable.dayOfWeek, dayOfWeek));
  if (!wh || wh.isOpen === "false" || !wh.openTime || !wh.closeTime) {
    return res.json([]);
  }

  // Compute total duration from one or multiple services
  let totalDuration = 0;
  if (serviceIds) {
    const ids = serviceIds.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const allServices = await db.select().from(servicesTable);
    const selected = allServices.filter(s => ids.includes(s.id));
    if (selected.length === 0) return res.status(404).json({ error: "No services found" });
    totalDuration = selected.reduce((sum, s) => sum + s.durationMinutes, 0);
  } else {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, parseInt(serviceId)));
    if (!service) return res.status(404).json({ error: "Service not found" });
    totalDuration = service.durationMinutes;
  }
  
  // Generate slots
  const slots: { time: string; available: boolean; reason?: string }[] = [];
  const [openH, openM] = wh.openTime.split(":").map(Number);
  const [closeH, closeM] = wh.closeTime.split(":").map(Number);
  let current = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  
  const breakStart = wh.breakStart ? (parseInt(wh.breakStart.split(":")[0]) * 60 + parseInt(wh.breakStart.split(":")[1])) : null;
  const breakEnd = wh.breakEnd ? (parseInt(wh.breakEnd.split(":")[0]) * 60 + parseInt(wh.breakEnd.split(":")[1])) : null;
  
  const existingAppts = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.date, date));
  
  // Also block past slots for today
  const now = new Date();
  const nowMins = now.getFullYear() === year && now.getMonth() === month - 1 && now.getDate() === day
    ? now.getHours() * 60 + now.getMinutes()
    : 0;
  
  while (current + totalDuration <= closeMinutes) {
    const slotEnd = current + totalDuration;
    const timeStr = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
    
    // Check break overlap
    const inBreak = breakStart !== null && breakEnd !== null &&
      current < breakEnd && slotEnd > breakStart;
    
    // Check existing appointment overlap
    const hasConflict = existingAppts.some(a => {
      if (a.status === "cancelled") return false;
      const [aH, aM] = a.startTime.split(":").map(Number);
      const [eH, eM] = a.endTime.split(":").map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = eH * 60 + eM;
      return current < aEnd && slotEnd > aStart;
    });

    const isPast = current < nowMins;
    
    if (!inBreak) {
      slots.push({
        time: timeStr,
        available: !hasConflict && !isPast,
        reason: hasConflict ? "ocupado" : isPast ? "passado" : undefined,
      });
    }
    
    current += 30; // 30 min intervals
  }
  
  res.json(slots);
});

// Public: register user (save to clients table so admin can see who signed up)
router.post("/public/register-user", async (req, res) => {
  const { name, phone, email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const existing = await db.select().from(clientsTable);
  const found = existing.find(c => c.email === email);
  if (found) {
    // Update name/phone if better data is available
    if ((name && name !== found.name) || (phone && phone !== found.phone)) {
      await db.update(clientsTable)
        .set({ name: name || found.name, phone: phone || found.phone })
        .where(eq(clientsTable.id, found.id));
    }
    return res.json({ ok: true });
  }

  await db.insert(clientsTable).values({
    name: name || email.split("@")[0],
    phone: phone || null,
    email,
  });
  res.json({ ok: true });
});

// Public booking
router.post("/public/book", async (req, res) => {
  const { clientName, clientPhone, clientEmail, serviceId, serviceIds, date, startTime, notes } = req.body;

  // Support single or multiple services
  let primaryServiceId: number;
  let combinedName: string;
  let combinedPrice: number;
  let totalDuration: number;

  if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
    const ids = serviceIds.map((id: number | string) => parseInt(String(id)));
    const allServices = await db.select().from(servicesTable);
    const selected = allServices.filter(s => ids.includes(s.id));
    if (selected.length === 0) return res.status(404).json({ error: "No services found" });
    primaryServiceId = selected[0].id;
    combinedName = selected.map(s => s.name).join(" + ");
    combinedPrice = selected.reduce((sum, s) => sum + parseFloat(String(s.price)), 0);
    totalDuration = selected.reduce((sum, s) => sum + s.durationMinutes, 0);
  } else {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, parseInt(serviceId)));
    if (!service) return res.status(404).json({ error: "Service not found" });
    primaryServiceId = service.id;
    combinedName = service.name;
    combinedPrice = parseFloat(String(service.price));
    totalDuration = service.durationMinutes;
  }
  
  // Find or create client
  let clientId = null;
  if (clientPhone || clientEmail) {
    const existing = await db.select().from(clientsTable);
    const found = existing.find(c => 
      (clientPhone && c.phone === clientPhone) || 
      (clientEmail && c.email === clientEmail)
    );
    if (found) {
      clientId = found.id;
    } else {
      const [newClient] = await db.insert(clientsTable).values({
        name: clientName,
        phone: clientPhone || null,
        email: clientEmail || null,
      }).returning();
      clientId = newClient.id;
    }
  }
  
  const [h, m] = startTime.split(":").map(Number);
  const totalMins = h * 60 + m + totalDuration;
  const endTime = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`;
  
  const [appt] = await db.insert(appointmentsTable).values({
    clientId,
    clientName,
    clientPhone: clientPhone || null,
    serviceId: primaryServiceId,
    serviceName: combinedName,
    servicePrice: String(combinedPrice),
    date,
    startTime,
    endTime,
    status: "confirmed",
    notes: notes || null,
  }).returning();
  
  const dateStr = typeof appt.date === "string" ? appt.date.slice(0, 10) : appt.date instanceof Date ? appt.date.toISOString().slice(0, 10) : String(appt.date).slice(0, 10);
  res.status(201).json({ ...appt, date: dateStr, servicePrice: parseFloat(appt.servicePrice), createdAt: appt.createdAt.toISOString() });
});

export default router;
