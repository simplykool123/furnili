import type { Express } from "express";
import { authenticateToken, requireRole, type AuthRequest } from "./middleware/auth";
import { db } from "./db";
import { 
  leadSources, 
  pipelineStages, 
  clients, 
  interactions, 
  users 
} from "@shared/schema";
import { eq, and, or, desc, asc, like } from "drizzle-orm";

export function registerCRMRoutes(app: Express) {
  // ============ LEAD SOURCES API ============
  app.get("/api/crm/lead-sources", authenticateToken, async (req, res) => {
    try {
      const sources = await db
        .select()
        .from(leadSources)
        .where(eq(leadSources.isActive, true))
        .orderBy(asc(leadSources.name));
      
      res.json(sources);
    } catch (error) {
      console.error("Error fetching lead sources:", error);
      res.status(500).json({ error: "Failed to fetch lead sources" });
    }
  });

  app.post("/api/crm/lead-sources", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, type, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const newSource = await db
        .insert(leadSources)
        .values({ name, type, description })
        .returning();
      
      res.status(201).json(newSource[0]);
    } catch (error) {
      console.error("Error creating lead source:", error);
      res.status(400).json({ error: "Failed to create lead source" });
    }
  });

  // ============ PIPELINE STAGES API ============
  app.get("/api/crm/pipeline-stages", authenticateToken, async (req, res) => {
    try {
      const stages = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.isActive, true))
        .orderBy(asc(pipelineStages.order));
      
      res.json(stages);
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
      res.status(500).json({ error: "Failed to fetch pipeline stages" });
    }
  });

  app.post("/api/crm/pipeline-stages", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, description, order, probability, color } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const newStage = await db
        .insert(pipelineStages)
        .values({ name, description, order: order || 0, probability, color })
        .returning();
      
      res.status(201).json(newStage[0]);
    } catch (error) {
      console.error("Error creating pipeline stage:", error);
      res.status(400).json({ error: "Failed to create pipeline stage" });
    }
  });

  // ============ LEADS API ============ 
  // Using clients table with type='lead' instead of separate leads table
  app.get("/api/crm/leads", authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;
      
      let whereConditions = [
        eq(clients.isActive, true),
        eq(clients.type, "lead") // Only get leads, not clients
      ];

      // Add search functionality
      if (search && search !== 'all') {
        const searchTerm = `%${search}%`;
        whereConditions.push(
          or(
            like(clients.name, searchTerm),
            like(clients.email, searchTerm),
            like(clients.mobile, searchTerm),
            like(clients.city, searchTerm)
          )!
        );
      }
      
      const leads = await db
        .select()
        .from(clients)
        .where(and(...whereConditions))
        .orderBy(desc(clients.createdAt));

      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get leads by stage and source for pipeline view
  app.get("/api/crm/leads/:stage/:source", authenticateToken, async (req, res) => {
    try {
      const { stage, source } = req.params;
      
      let whereConditions = [
        eq(clients.isActive, true),
        eq(clients.type, "lead")
      ];

      // For now, just return all leads since clients table doesn't have stage/source fields yet
      // TODO: Add stage/source fields to clients table for full CRM functionality
      
      const leads = await db
        .select()
        .from(clients)
        .where(and(...whereConditions))
        .orderBy(desc(clients.createdAt));

      res.json(leads);
    } catch (error) {
      console.error("Error fetching filtered leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/crm/leads", authenticateToken, requireRole(['admin', 'manager', 'staff']), async (req, res) => {
    try {
      const { name, email, mobile, city, contactPerson, phone, address1, address2, state, pinCode } = req.body;
      
      if (!name || !mobile || !city) {
        return res.status(400).json({ error: "Name, mobile, and city are required" });
      }

      const newLead = await db
        .insert(clients)
        .values({
          name,
          email,
          mobile, 
          city,
          contactPerson,
          phone,
          address1,
          address2,
          state,
          pinCode,
          type: "lead" // This makes it a lead instead of a client
        })
        .returning();
      
      res.status(201).json(newLead[0]);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  // Convert lead to client
  app.put("/api/crm/leads/:id/convert", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      const updatedClient = await db
        .update(clients)
        .set({ 
          type: "client", // Convert from lead to client
          updatedAt: new Date()
        })
        .where(and(
          eq(clients.id, leadId),
          eq(clients.type, "lead")
        ))
        .returning();

      if (!updatedClient[0]) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(updatedClient[0]);
    } catch (error) {
      console.error("Error converting lead to client:", error);
      res.status(500).json({ error: "Failed to convert lead" });
    }
  });

  // ============ INTERACTIONS API ============
  app.get("/api/crm/interactions/:entityType/:entityId", authenticateToken, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      const interactionData = await db
        .select({
          interaction: interactions,
          user: {
            id: users.id,
            name: users.name,
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .where(and(
          eq(interactions.entityType, entityType),
          eq(interactions.entityId, parseInt(entityId))
        ))
        .orderBy(desc(interactions.createdAt));

      res.json(interactionData);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.post("/api/crm/interactions", authenticateToken, async (req, res) => {
    try {
      const { entityType, entityId, type, direction, subject, content, outcome, duration } = req.body;
      
      if (!entityType || !entityId || !type || !subject) {
        return res.status(400).json({ error: "EntityType, entityId, type, and subject are required" });
      }

      const newInteraction = await db
        .insert(interactions)
        .values({
          entityType,
          entityId: parseInt(entityId),
          type,
          direction: direction || "outbound",
          subject,
          content,
          outcome,
          duration: duration ? parseInt(duration) : null,
          userId: (req as AuthRequest).user!.id,
          completedDate: new Date()
        })
        .returning();
      
      res.status(201).json(newInteraction[0]);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(400).json({ error: "Failed to create interaction" });
    }
  });
}