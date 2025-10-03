import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("inspector"), // inspector, manager, admin
  certificationNumber: text("certification_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Buildings table
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(), // commercial, residential, industrial
  floors: integer("floors").notNull(),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Equipment table
export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull().references(() => buildings.id),
  type: text("type").notNull(), // extinguisher, sprinkler, smoke_detector, alarm, emergency_exit
  location: text("location").notNull(),
  serialNumber: text("serial_number").unique(),
  installationDate: timestamp("installation_date"),
  lastInspectionDate: timestamp("last_inspection_date"),
  status: text("status").notNull().default("active"), // active, maintenance, decommissioned
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inspections table
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull().references(() => buildings.id),
  inspectorId: varchar("inspector_id").notNull().references(() => users.id),
  type: text("type").notNull(), // routine, emergency, annual
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, overdue
  reportUrl: text("report_url"),
  signatureUrl: text("signature_url"), // Digital signature for completed inspections
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inspection items table
export const inspectionItems = pgTable("inspection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull().references(() => inspections.id),
  equipmentId: varchar("equipment_id").notNull().references(() => equipment.id),
  status: text("status").notNull(), // pass, fail, needs_attention
  notes: text("notes"),
  photos: jsonb("photos").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Compliance rules table
export const complianceRules = pgTable("compliance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  frequency: integer("frequency").notNull(), // in days
  equipmentType: text("equipment_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(), // inspection_report, compliance_certificate, maintenance_record, safety_manual
  inspectionId: varchar("inspection_id").references(() => inspections.id),
  buildingId: varchar("building_id").references(() => buildings.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").notNull().default("active"), // active, archived, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  inspections: many(inspections),
  documents: many(documents),
}));

export const buildingsRelations = relations(buildings, ({ many }) => ({
  equipment: many(equipment),
  inspections: many(inspections),
  documents: many(documents),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  building: one(buildings, {
    fields: [equipment.buildingId],
    references: [buildings.id],
  }),
  inspectionItems: many(inspectionItems),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  building: one(buildings, {
    fields: [inspections.buildingId],
    references: [buildings.id],
  }),
  inspector: one(users, {
    fields: [inspections.inspectorId],
    references: [users.id],
  }),
  items: many(inspectionItems),
  documents: many(documents),
}));

export const inspectionItemsRelations = relations(inspectionItems, ({ one }) => ({
  inspection: one(inspections, {
    fields: [inspectionItems.inspectionId],
    references: [inspections.id],
  }),
  equipment: one(equipment, {
    fields: [inspectionItems.equipmentId],
    references: [equipment.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  building: one(buildings, {
    fields: [documents.buildingId],
    references: [buildings.id],
  }),
  inspection: one(inspections, {
    fields: [documents.inspectionId],
    references: [inspections.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  certificationNumber: true,
});

// Create separate schemas for create vs update operations
export const createUserSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

// Secure schemas for inspector management that exclude role field
export const updateInspectorSchema = insertUserSchema.omit({ role: true }).partial().extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const insertBuildingSchema = createInsertSchema(buildings).pick({
  name: true,
  address: true,
  type: true,
  floors: true,
  contactPerson: true,
  contactPhone: true,
});

export const insertEquipmentSchema = createInsertSchema(equipment).pick({
  buildingId: true,
  type: true,
  location: true,
  serialNumber: true,
  installationDate: true,
  lastInspectionDate: true,
  status: true,
}).partial({
  lastInspectionDate: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).pick({
  buildingId: true,
  inspectorId: true,
  type: true,
  scheduledDate: true,
  notes: true,
  signatureUrl: true,
  status: true,
}).partial({
  signatureUrl: true,
  status: true,
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems, {
  photos: z.array(z.string()).optional().nullable(),
}).pick({
  inspectionId: true,
  equipmentId: true,
  status: true,
  notes: true,
  photos: true,
});

export const insertComplianceRuleSchema = createInsertSchema(complianceRules).pick({
  code: true,
  description: true,
  frequency: true,
  equipmentType: true,
  isActive: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  type: true,
  inspectionId: true,
  buildingId: true,
  uploadedBy: true,
  fileUrl: true,
  fileSize: true,
  status: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
