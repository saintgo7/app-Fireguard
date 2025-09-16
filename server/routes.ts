import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertBuildingSchema, insertEquipmentSchema, insertInspectionSchema,
  insertInspectionItemSchema, insertComplianceRuleSchema, insertDocumentSchema,
  createUserSchema, updateUserSchema, updateInspectorSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { generateInspectionReport, generateComplianceReport } from "./services/pdfService";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Middleware for role-based access control
  const requireRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      next();
    };
  };

  // Helper function to sanitize user objects (remove password)
  const sanitizeUser = (user: any) => {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  };

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Buildings API
  app.get("/api/buildings", async (req, res) => {
    try {
      const buildings = await storage.getAllBuildings();
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ error: "Failed to fetch buildings" });
    }
  });

  app.get("/api/buildings/:id", async (req, res) => {
    try {
      const building = await storage.getBuilding(req.params.id);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      res.json(building);
    } catch (error) {
      console.error("Error fetching building:", error);
      res.status(500).json({ error: "Failed to fetch building" });
    }
  });

  app.post("/api/buildings", async (req, res) => {
    try {
      const validatedData = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(validatedData);
      res.status(201).json(building);
    } catch (error) {
      console.error("Error creating building:", error);
      res.status(400).json({ error: "Failed to create building" });
    }
  });

  app.put("/api/buildings/:id", async (req, res) => {
    try {
      const validatedData = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(req.params.id, validatedData);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      res.json(building);
    } catch (error) {
      console.error("Error updating building:", error);
      res.status(400).json({ error: "Failed to update building" });
    }
  });

  app.delete("/api/buildings/:id", async (req, res) => {
    try {
      const success = await storage.deleteBuilding(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Building not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting building:", error);
      res.status(500).json({ error: "Failed to delete building" });
    }
  });

  // Equipment API
  app.get("/api/equipment", async (req, res) => {
    try {
      const equipment = await storage.getAllEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/building/:buildingId", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentByBuilding(req.params.buildingId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment by building:", error);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.parse(req.body);
      const equipment = await storage.createEquipment(validatedData);
      res.status(201).json(equipment);
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(400).json({ error: "Failed to create equipment" });
    }
  });

  app.put("/api/equipment/:id", async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.partial().parse(req.body);
      const equipment = await storage.updateEquipment(req.params.id, validatedData);
      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      res.status(400).json({ error: "Failed to update equipment" });
    }
  });

  // Inspections API
  app.get("/api/inspections", async (req, res) => {
    try {
      const inspections = await storage.getAllInspections();
      res.json(inspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      res.status(500).json({ error: "Failed to fetch inspections" });
    }
  });

  app.get("/api/inspections/:id", async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ error: "Failed to fetch inspection" });
    }
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      res.status(201).json(inspection);
    } catch (error) {
      console.error("Error creating inspection:", error);
      res.status(400).json({ error: "Failed to create inspection" });
    }
  });

  app.put("/api/inspections/:id", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.partial().parse(req.body);
      const inspection = await storage.updateInspection(req.params.id, validatedData);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      console.error("Error updating inspection:", error);
      res.status(400).json({ error: "Failed to update inspection" });
    }
  });

  // Inspection Items API
  app.get("/api/inspections/:id/items", async (req, res) => {
    try {
      const items = await storage.getInspectionItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inspection items:", error);
      res.status(500).json({ error: "Failed to fetch inspection items" });
    }
  });

  app.post("/api/inspection-items", async (req, res) => {
    try {
      const validatedData = insertInspectionItemSchema.parse(req.body);
      const item = await storage.createInspectionItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inspection item:", error);
      res.status(400).json({ error: "Failed to create inspection item" });
    }
  });

  // Compliance Rules API
  app.get("/api/compliance-rules", async (req, res) => {
    try {
      const rules = await storage.getAllComplianceRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching compliance rules:", error);
      res.status(500).json({ error: "Failed to fetch compliance rules" });
    }
  });

  app.post("/api/compliance-rules", async (req, res) => {
    try {
      const validatedData = insertComplianceRuleSchema.parse(req.body);
      const rule = await storage.createComplianceRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating compliance rule:", error);
      res.status(400).json({ error: "Failed to create compliance rule" });
    }
  });

  app.put("/api/compliance-rules/:id", async (req, res) => {
    try {
      const validatedData = insertComplianceRuleSchema.partial().parse(req.body);
      const rule = await storage.updateComplianceRule(req.params.id, validatedData);
      if (!rule) {
        return res.status(404).json({ error: "Compliance rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating compliance rule:", error);
      res.status(400).json({ error: "Failed to update compliance rule" });
    }
  });

  app.delete("/api/compliance-rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteComplianceRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Compliance rule not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting compliance rule:", error);
      res.status(500).json({ error: "Failed to delete compliance rule" });
    }
  });

  // Documents API
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(400).json({ error: "Failed to create document" });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(req.params.id, validatedData);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(400).json({ error: "Failed to update document" });
    }
  });

  app.put("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { fileURL, documentType = "safety_manual", title, buildingId, inspectionId } = req.body;
    
    if (!fileURL || !title) {
      return res.status(400).json({ error: "fileURL and title are required" });
    }

    try {
      const userId = req.user?.id;
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded document
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: userId,
          visibility: "private", // Documents should be private by default
          aclRules: []
        },
      );

      // Create document record in database
      const document = await storage.createDocument({
        title,
        type: documentType,
        buildingId: buildingId || null,
        inspectionId: inspectionId || null,
        uploadedBy: userId!,
        fileUrl: objectPath,
        fileSize: 0, // Could be extracted from file metadata if needed
        status: "active"
      });

      res.status(200).json({
        objectPath: objectPath,
        document: document
      });
    } catch (error) {
      console.error("Error setting document ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Users API (Admin only)
  app.get("/api/users", requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Sanitize all user responses to remove passwords
      const sanitizedUsers = users.map(sanitizeUser);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Inspector Management API (Admin/Manager only)
  app.get("/api/inspectors", requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const inspectors = await storage.getUsersByRole("inspector");
      // Sanitize all inspector responses to remove passwords
      const sanitizedInspectors = inspectors.map(sanitizeUser);
      res.json(sanitizedInspectors);
    } catch (error) {
      console.error("Error fetching inspectors:", error);
      res.status(500).json({ error: "Failed to fetch inspectors" });
    }
  });

  app.post("/api/inspectors", requireRole(["admin", "manager"]), async (req, res) => {
    try {
      // Use createUserSchema which requires password
      const parsed = createUserSchema.parse({ ...req.body, role: "inspector" });
      
      // Hash password with bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(parsed.password, saltRounds);
      
      const inspector = await storage.createUser({
        ...parsed,
        password: hashedPassword,
      });
      
      // Return sanitized response without password
      res.status(201).json(sanitizeUser(inspector));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "유효하지 않은 데이터입니다.", 
          details: error.errors 
        });
      }
      console.error("Error creating inspector:", error);
      res.status(500).json({ error: "점검원 생성에 실패했습니다." });
    }
  });

  app.put("/api/inspectors/:id", requireRole(["admin", "manager"]), async (req, res) => {
    try {
      // First verify the target user exists and is an inspector
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "점검원을 찾을 수 없습니다." });
      }
      if (targetUser.role !== "inspector") {
        return res.status(403).json({ error: "대상 사용자가 점검원이 아닙니다." });
      }
      
      // Use updateInspectorSchema which excludes role field to prevent privilege escalation
      const parsed = updateInspectorSchema.parse(req.body);
      let updatePayload = { ...parsed };
      
      // If password is being updated, hash it with bcrypt
      if (parsed.password) {
        const saltRounds = 12;
        updatePayload.password = await bcrypt.hash(parsed.password, saltRounds);
      }
      
      const inspector = await storage.updateUser(req.params.id, updatePayload);
      if (!inspector) {
        return res.status(404).json({ error: "점검원을 찾을 수 없습니다." });
      }
      
      // Return sanitized response without password
      res.json(sanitizeUser(inspector));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "유효하지 않은 데이터입니다.", 
          details: error.errors 
        });
      }
      console.error("Error updating inspector:", error);
      res.status(500).json({ error: "점검원 업데이트에 실패했습니다." });
    }
  });

  app.delete("/api/inspectors/:id", requireRole(["admin", "manager"]), async (req, res) => {
    try {
      // First verify the target user exists and is an inspector
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "점검원을 찾을 수 없습니다." });
      }
      if (targetUser.role !== "inspector") {
        return res.status(403).json({ error: "대상 사용자가 점검원이 아닙니다." });
      }
      
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "점검원을 찾을 수 없습니다." });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting inspector:", error);
      res.status(500).json({ error: "점검원 삭제에 실패했습니다." });
    }
  });

  // Report Generation API
  app.post("/api/reports/inspection/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }

      const building = await storage.getBuilding(inspection.buildingId);
      const inspector = await storage.getUser(inspection.inspectorId);
      const items = await storage.getInspectionItems(inspection.id);

      if (!building || !inspector) {
        return res.status(404).json({ error: "Required data not found" });
      }

      const pdfBuffer = await generateInspectionReport({
        inspection,
        building,
        inspector,
        items,
        userId: req.user!.id,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="inspection-report-${inspection.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating inspection report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.post("/api/reports/compliance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { buildingId, startDate, endDate } = req.body;
      
      const building = buildingId ? await storage.getBuilding(buildingId) : null;
      const inspections = await storage.getAllInspections();
      const rules = await storage.getAllComplianceRules();

      const pdfBuffer = await generateComplianceReport({
        building,
        inspections,
        rules,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating compliance report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Object Storage endpoints for file uploads (protected)
  
  // Serve public objects - no authentication required
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects with access control
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      
      // Get user ID from session if authenticated
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for file upload
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Update ACL policy after upload for inspection photos
  app.put("/api/inspection-photos", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    if (!req.body.photoURL || !req.body.inspectionId) {
      return res.status(400).json({ error: "photoURL and inspectionId are required" });
    }

    try {
      const userId = req.user?.id;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "private", // Inspection photos should be private
          aclRules: []
        },
      );

      // Store the photo reference in inspection items if needed
      // This could be extended to link to inspection items table
      
      res.status(200).json({
        objectPath: objectPath,
        inspectionId: req.body.inspectionId
      });
    } catch (error) {
      console.error("Error setting inspection photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update ACL policy after upload for inspection signatures
  app.put("/api/inspection-signatures", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    if (!req.body.signatureURL) {
      return res.status(400).json({ error: "signatureURL is required" });
    }

    try {
      const userId = req.user?.id;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.signatureURL,
        {
          owner: userId,
          visibility: "private", // Inspection signatures should be private
          aclRules: []
        },
      );
      
      res.status(200).json({
        objectPath: objectPath,
        inspectionId: req.body.inspectionId || null
      });
    } catch (error) {
      console.error("Error setting inspection signature:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
