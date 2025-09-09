import type { Express } from "express";
import { db } from "./db";
import { 
  leads, leadSources, pipelineStages, interactions, satisfactionSurveys,
  clients, users,
  insertLeadSchema, insertInteractionSchema, insertSatisfactionSurveySchema,
  insertLeadSourceSchema, insertPipelineStageSchema,
  type Lead, type LeadWithDetails, type Interaction, type InteractionWithDetails
} from "@shared/schema";
import { eq, desc, and, like, or, sql, count } from "drizzle-orm";
import { authenticateToken, type AuthRequest } from "./middleware/auth";

export function registerCRMRoutes(app: Express) {
  
  // ============ LEAD SOURCES API ============
  app.get("/api/crm/lead-sources", authenticateToken, async (req, res) => {
    try {
      const sources = await db
        .select()
        .from(leadSources)
        .where(eq(leadSources.isActive, true))
        .orderBy(leadSources.name);
      
      res.json(sources);
    } catch (error) {
      console.error("Error fetching lead sources:", error);
      res.status(500).json({ error: "Failed to fetch lead sources" });
    }
  });

  app.post("/api/crm/lead-sources", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertLeadSourceSchema.parse(req.body);
      const [newSource] = await db
        .insert(leadSources)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newSource);
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
        .orderBy(pipelineStages.order);
      
      res.json(stages);
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
      res.status(500).json({ error: "Failed to fetch pipeline stages" });
    }
  });

  // ============ LEADS API ============
  app.get("/api/crm/leads", authenticateToken, async (req, res) => {
    try {
      const { search, status, sourceId, stageId, assignedTo } = req.query;
      
      let whereConditions = [eq(leads.isActive, true)];
      
      if (status && status !== 'all') {
        whereConditions.push(eq(leads.status, status as string));
      }
      
      if (sourceId) {
        whereConditions.push(eq(leads.sourceId, parseInt(sourceId as string)));
      }
      
      if (stageId) {
        whereConditions.push(eq(leads.stageId, parseInt(stageId as string)));
      }
      
      if (assignedTo) {
        whereConditions.push(eq(leads.assignedTo, parseInt(assignedTo as string)));
      }

      let query = db
        .select({
          lead: leads,
          source: leadSources,
          stage: pipelineStages,
          assignedUser: {
            id: users.id,
            name: users.name,
          },
          createdByUser: {
            id: users.id,
            name: users.name,
          }
        })
        .from(leads)
        .leftJoin(leadSources, eq(leads.sourceId, leadSources.id))
        .leftJoin(pipelineStages, eq(leads.stageId, pipelineStages.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .leftJoin(users, eq(leads.createdBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(leads.createdAt));

      const leadsData = await query;

      // Apply search filter
      let filteredLeads = leadsData;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredLeads = leadsData.filter(item => 
          item.lead.firstName.toLowerCase().includes(searchTerm) ||
          item.lead.lastName?.toLowerCase().includes(searchTerm) ||
          item.lead.company?.toLowerCase().includes(searchTerm) ||
          item.lead.phone.includes(searchTerm) ||
          item.lead.email?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/crm/leads/:id", authenticateToken, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      const leadData = await db
        .select({
          lead: leads,
          source: leadSources,
          stage: pipelineStages,
          assignedUser: {
            id: users.id,
            name: users.name,
          },
          convertedClient: {
            id: clients.id,
            name: clients.name,
          }
        })
        .from(leads)
        .leftJoin(leadSources, eq(leads.sourceId, leadSources.id))
        .leftJoin(pipelineStages, eq(leads.stageId, pipelineStages.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .leftJoin(clients, eq(leads.convertedToClientId, clients.id))
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!leadData[0]) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get recent interactions
      const recentInteractions = await db
        .select({
          interaction: interactions,
          user: {
            name: users.name,
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .where(and(
          eq(interactions.entityType, "lead"),
          eq(interactions.entityId, leadId)
        ))
        .orderBy(desc(interactions.createdAt))
        .limit(5);

      const response = {
        ...leadData[0].lead,
        source: leadData[0].source,
        stage: leadData[0].stage,
        assignedUser: leadData[0].assignedUser,
        convertedClient: leadData[0].convertedClient,
        recentInteractions: recentInteractions.map(item => ({
          ...item.interaction,
          user: item.user,
        })),
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/crm/leads", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      
      // Generate lead number
      const lastLead = await db
        .select({ leadNumber: leads.leadNumber })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastLead.length > 0) {
        const lastNumber = parseInt(lastLead[0].leadNumber.substring(2));
        nextNumber = lastNumber + 1;
      }
      
      const leadNumber = `L-${nextNumber.toString().padStart(3, '0')}`;

      const validatedData = insertLeadSchema.parse({
        ...req.body,
        leadNumber,
        createdBy: userId,
      });

      const [newLead] = await db
        .insert(leads)
        .values({ ...validatedData, leadNumber })
        .returning();

      res.status(201).json(newLead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(400).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/crm/leads/:id", authenticateToken, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const updates = req.body;

      const [updatedLead] = await db
        .update(leads)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(leads.id, leadId))
        .returning();

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Convert Lead to Client
  app.post("/api/crm/leads/:id/convert", authenticateToken, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      // Get lead data
      const [leadData] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!leadData) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Create client from lead data
      const clientName = `${leadData.firstName} ${leadData.lastName || ''}`.trim();
      const [newClient] = await db
        .insert(clients)
        .values({
          name: leadData.company || clientName,
          email: leadData.email,
          mobile: leadData.phone,
          phone: leadData.mobile,
          city: leadData.city,
          address1: leadData.address,
          state: leadData.state,
          pinCode: leadData.pinCode,
          convertedFromLeadId: leadId,
        })
        .returning();

      // Update lead as converted
      await db
        .update(leads)
        .set({
          status: 'won',
          convertedToClientId: newClient.id,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      res.json(newClient);
    } catch (error) {
      console.error("Error converting lead:", error);
      res.status(500).json({ error: "Failed to convert lead" });
    }
  });

  // ============ INTERACTIONS API ============
  app.get("/api/crm/interactions", authenticateToken, async (req, res) => {
    try {
      const { entityType, entityId, type } = req.query;
      
      let whereConditions = [];
      
      if (entityType) {
        whereConditions.push(eq(interactions.entityType, entityType as string));
      }
      
      if (entityId) {
        whereConditions.push(eq(interactions.entityId, parseInt(entityId as string)));
      }
      
      if (type) {
        whereConditions.push(eq(interactions.type, type as string));
      }

      const interactionsData = await db
        .select({
          interaction: interactions,
          user: {
            name: users.name,
            email: users.email,
          }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
        .orderBy(desc(interactions.createdAt));

      res.json(interactionsData);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.post("/api/crm/interactions", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      const validatedData = insertInteractionSchema.parse({
        ...req.body,
        userId,
      });

      const [newInteraction] = await db
        .insert(interactions)
        .values(validatedData)
        .returning();

      res.status(201).json(newInteraction);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(400).json({ error: "Failed to create interaction" });
    }
  });

  // ============ CRM DASHBOARD STATS ============
  app.get("/api/crm/dashboard-stats", authenticateToken, async (req, res) => {
    try {
      // Get leads stats
      const [leadsStats] = await db
        .select({
          totalLeads: count(leads.id),
        })
        .from(leads)
        .where(eq(leads.isActive, true));

      const [newLeads] = await db
        .select({ count: count(leads.id) })
        .from(leads)
        .where(and(
          eq(leads.isActive, true),
          eq(leads.status, 'new')
        ));

      const [qualifiedLeads] = await db
        .select({ count: count(leads.id) })
        .from(leads)
        .where(and(
          eq(leads.isActive, true),
          eq(leads.status, 'qualified')
        ));

      const [convertedLeads] = await db
        .select({ count: count(leads.id) })
        .from(leads)
        .where(and(
          eq(leads.isActive, true),
          eq(leads.status, 'won')
        ));

      // Get recent interactions
      const recentInteractions = await db
        .select({
          interaction: interactions,
          user: { name: users.name }
        })
        .from(interactions)
        .leftJoin(users, eq(interactions.userId, users.id))
        .orderBy(desc(interactions.createdAt))
        .limit(5);

      const stats = {
        totalLeads: leadsStats.totalLeads || 0,
        newLeads: newLeads.count || 0,
        qualifiedLeads: qualifiedLeads.count || 0,
        convertedLeads: convertedLeads.count || 0,
        conversionRate: leadsStats.totalLeads > 0 
          ? Math.round(((convertedLeads.count || 0) / leadsStats.totalLeads) * 100) 
          : 0,
        recentInteractions: recentInteractions,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching CRM stats:", error);
      res.status(500).json({ error: "Failed to fetch CRM stats" });
    }
  });

  // ============ SATISFACTION SURVEYS API ============
  app.post("/api/crm/satisfaction-surveys", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      const validatedData = insertSatisfactionSurveySchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const [newSurvey] = await db
        .insert(satisfactionSurveys)
        .values(validatedData)
        .returning();

      res.status(201).json(newSurvey);
    } catch (error) {
      console.error("Error creating satisfaction survey:", error);
      res.status(400).json({ error: "Failed to create survey" });
    }
  });

  app.get("/api/crm/satisfaction-surveys", authenticateToken, async (req, res) => {
    try {
      const { clientId, projectId } = req.query;
      
      let whereConditions = [];
      
      if (clientId) {
        whereConditions.push(eq(satisfactionSurveys.clientId, parseInt(clientId as string)));
      }
      
      if (projectId) {
        whereConditions.push(eq(satisfactionSurveys.projectId, parseInt(projectId as string)));
      }

      const surveysData = await db
        .select({
          survey: satisfactionSurveys,
          client: {
            id: clients.id,
            name: clients.name,
          }
        })
        .from(satisfactionSurveys)
        .leftJoin(clients, eq(satisfactionSurveys.clientId, clients.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
        .orderBy(desc(satisfactionSurveys.createdAt));

      res.json(surveysData);
    } catch (error) {
      console.error("Error fetching satisfaction surveys:", error);
      res.status(500).json({ error: "Failed to fetch surveys" });
    }
  });
}