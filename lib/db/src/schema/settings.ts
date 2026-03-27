import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  studioName: text("studio_name").notNull().default("Studio Layse Duarte"),
  primaryColor: text("primary_color").notNull().default("#e91e8c"),
  welcomeMessage: text("welcome_message"),
  bookingMessage: text("booking_message"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workingHoursTable = pgTable("working_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: serial("day_of_week").notNull(),
  dayName: text("day_name").notNull(),
  isOpen: text("is_open").notNull().default("true"),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export const insertWorkingHoursSchema = createInsertSchema(workingHoursTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
export type WorkingHours = typeof workingHoursTable.$inferSelect;
