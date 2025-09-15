import { 
  users, buildings, equipment, inspections, inspectionItems, complianceRules,
  type User, type InsertUser, type Building, type InsertBuilding,
  type Equipment, type InsertEquipment, type Inspection, type InsertInspection,
  type InspectionItem, type InsertInspectionItem, type ComplianceRule, type InsertComplianceRule
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Buildings
  getAllBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building | undefined>;
  deleteBuilding(id: string): Promise<boolean>;

  // Equipment
  getAllEquipment(): Promise<Equipment[]>;
  getEquipmentByBuilding(buildingId: string): Promise<Equipment[]>;
  getEquipment(id: string): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<boolean>;

  // Inspections
  getAllInspections(): Promise<Inspection[]>;
  getInspectionsByBuilding(buildingId: string): Promise<Inspection[]>;
  getInspectionsByInspector(inspectorId: string): Promise<Inspection[]>;
  getInspection(id: string): Promise<Inspection | undefined>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;

  // Inspection Items
  getInspectionItems(inspectionId: string): Promise<InspectionItem[]>;
  createInspectionItem(item: InsertInspectionItem): Promise<InspectionItem>;
  updateInspectionItem(id: string, item: Partial<InsertInspectionItem>): Promise<InspectionItem | undefined>;

  // Compliance Rules
  getAllComplianceRules(): Promise<ComplianceRule[]>;
  getComplianceRule(id: string): Promise<ComplianceRule | undefined>;
  createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule>;
  updateComplianceRule(id: string, rule: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined>;
  deleteComplianceRule(id: string): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalInspections: number;
    pendingInspections: number;
    totalEquipment: number;
    complianceRate: number;
  }>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Buildings
  async getAllBuildings(): Promise<Building[]> {
    return await db.select().from(buildings).orderBy(desc(buildings.createdAt));
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building || undefined;
  }

  async createBuilding(insertBuilding: InsertBuilding): Promise<Building> {
    const [building] = await db
      .insert(buildings)
      .values(insertBuilding)
      .returning();
    return building;
  }

  async updateBuilding(id: string, updateBuilding: Partial<InsertBuilding>): Promise<Building | undefined> {
    const [building] = await db
      .update(buildings)
      .set(updateBuilding)
      .where(eq(buildings.id, id))
      .returning();
    return building || undefined;
  }

  async deleteBuilding(id: string): Promise<boolean> {
    const result = await db.delete(buildings).where(eq(buildings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Equipment
  async getAllEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment).orderBy(desc(equipment.createdAt));
  }

  async getEquipmentByBuilding(buildingId: string): Promise<Equipment[]> {
    return await db.select().from(equipment).where(eq(equipment.buildingId, buildingId));
  }

  async getEquipment(id: string): Promise<Equipment | undefined> {
    const [equipmentItem] = await db.select().from(equipment).where(eq(equipment.id, id));
    return equipmentItem || undefined;
  }

  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    const [equipmentItem] = await db
      .insert(equipment)
      .values(insertEquipment)
      .returning();
    return equipmentItem;
  }

  async updateEquipment(id: string, updateEquipment: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [equipmentItem] = await db
      .update(equipment)
      .set(updateEquipment)
      .where(eq(equipment.id, id))
      .returning();
    return equipmentItem || undefined;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const result = await db.delete(equipment).where(eq(equipment.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Inspections
  async getAllInspections(): Promise<Inspection[]> {
    return await db.select().from(inspections).orderBy(desc(inspections.scheduledDate));
  }

  async getInspectionsByBuilding(buildingId: string): Promise<Inspection[]> {
    return await db.select().from(inspections).where(eq(inspections.buildingId, buildingId));
  }

  async getInspectionsByInspector(inspectorId: string): Promise<Inspection[]> {
    return await db.select().from(inspections).where(eq(inspections.inspectorId, inspectorId));
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
    return inspection || undefined;
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    const [inspection] = await db
      .insert(inspections)
      .values(insertInspection)
      .returning();
    return inspection;
  }

  async updateInspection(id: string, updateInspection: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const [inspection] = await db
      .update(inspections)
      .set(updateInspection)
      .where(eq(inspections.id, id))
      .returning();
    return inspection || undefined;
  }

  async deleteInspection(id: string): Promise<boolean> {
    const result = await db.delete(inspections).where(eq(inspections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Inspection Items
  async getInspectionItems(inspectionId: string): Promise<InspectionItem[]> {
    return await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId));
  }

  async createInspectionItem(insertItem: InsertInspectionItem): Promise<InspectionItem> {
    const { photos, ...restItem } = insertItem;
    const [item] = await db
      .insert(inspectionItems)
      .values({
        ...restItem,
        photos: photos ?? []
      })
      .returning();
    return item;
  }

  async updateInspectionItem(id: string, updateItem: Partial<InsertInspectionItem>): Promise<InspectionItem | undefined> {
    const setData: any = { ...updateItem };
    if (updateItem.photos) {
      setData.photos = updateItem.photos;
    }
    const [item] = await db
      .update(inspectionItems)
      .set(setData)
      .where(eq(inspectionItems.id, id))
      .returning();
    return item || undefined;
  }

  // Compliance Rules
  async getAllComplianceRules(): Promise<ComplianceRule[]> {
    return await db.select().from(complianceRules).orderBy(desc(complianceRules.createdAt));
  }

  async getComplianceRule(id: string): Promise<ComplianceRule | undefined> {
    const [rule] = await db.select().from(complianceRules).where(eq(complianceRules.id, id));
    return rule || undefined;
  }

  async createComplianceRule(insertRule: InsertComplianceRule): Promise<ComplianceRule> {
    const [rule] = await db
      .insert(complianceRules)
      .values(insertRule)
      .returning();
    return rule;
  }

  async updateComplianceRule(id: string, updateRule: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined> {
    const [rule] = await db
      .update(complianceRules)
      .set(updateRule)
      .where(eq(complianceRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteComplianceRule(id: string): Promise<boolean> {
    const result = await db.delete(complianceRules).where(eq(complianceRules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalInspections: number;
    pendingInspections: number;
    totalEquipment: number;
    complianceRate: number;
  }> {
    const [totalInspections] = await db
      .select({ count: count() })
      .from(inspections)
      .where(eq(inspections.status, "completed"));

    const [pendingInspections] = await db
      .select({ count: count() })
      .from(inspections)
      .where(and(
        eq(inspections.status, "scheduled"),
        lte(inspections.scheduledDate, new Date())
      ));

    const [totalEquipment] = await db
      .select({ count: count() })
      .from(equipment)
      .where(eq(equipment.status, "active"));

    // Calculate compliance rate (simplified)
    const [completedItems] = await db
      .select({ count: count() })
      .from(inspectionItems)
      .where(eq(inspectionItems.status, "pass"));

    const [totalItems] = await db
      .select({ count: count() })
      .from(inspectionItems);

    const complianceRate = totalItems.count > 0 
      ? Math.round((completedItems.count / totalItems.count) * 100) 
      : 100;

    return {
      totalInspections: totalInspections.count,
      pendingInspections: pendingInspections.count,
      totalEquipment: totalEquipment.count,
      complianceRate,
    };
  }
}

export const storage = new DatabaseStorage();
