import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// UUID 생성을 위한 헬퍼 함수
const generateId = () => crypto.randomUUID();

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("inspector"), // inspector, manager, admin
  certificationNumber: text("certification_number"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Buildings table
export const buildings = sqliteTable("buildings", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(), // commercial, residential, industrial
  floors: integer("floors").notNull(),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Equipment table
export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  buildingId: text("building_id").notNull().references(() => buildings.id),
  type: text("type").notNull(), // extinguisher, sprinkler, smoke_detector, alarm, emergency_exit
  location: text("location").notNull(),
  serialNumber: text("serial_number").unique(),
  installationDate: integer("installation_date", { mode: 'timestamp' }),
  lastInspectionDate: integer("last_inspection_date", { mode: 'timestamp' }),
  status: text("status").notNull().default("active"), // active, maintenance, decommissioned
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Inspections table
export const inspections = sqliteTable("inspections", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  buildingId: text("building_id").notNull().references(() => buildings.id),
  inspectorId: text("inspector_id").notNull().references(() => users.id),
  type: text("type").notNull(), // routine, emergency, annual
  scheduledDate: integer("scheduled_date", { mode: 'timestamp' }).notNull(),
  completedDate: integer("completed_date", { mode: 'timestamp' }),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, overdue
  reportUrl: text("report_url"),
  signatureUrl: text("signature_url"), // Digital signature for completed inspections
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Inspection items table
export const inspectionItems = sqliteTable("inspection_items", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id),
  equipmentId: text("equipment_id").notNull().references(() => equipment.id),
  status: text("status").notNull(), // pass, fail, needs_attention
  notes: text("notes"),
  photos: text("photos", { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Compliance rules table
export const complianceRules = sqliteTable("compliance_rules", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  frequency: integer("frequency").notNull(), // in days
  equipmentType: text("equipment_type").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Documents table
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  title: text("title").notNull(),
  type: text("type").notNull(), // inspection_report, compliance_certificate, maintenance_record, safety_manual
  inspectionId: text("inspection_id").references(() => inspections.id),
  buildingId: text("building_id").references(() => buildings.id),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").notNull().default("active"), // active, archived, expired
  createdAt: integer("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
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
}).partial({
  signatureUrl: true,
});

export const insertInspectionItemSchema = createInsertSchema(inspectionItems).pick({
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
