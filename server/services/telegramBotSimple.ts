import TelegramBot from 'node-telegram-bot-api';
import { db } from '../db.js';
import { telegramUserSessions, projects, clients, projectFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class FurniliTelegramBot {
  private bot: TelegramBot;
  
  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
    console.log('🤖 Furnili Telegram Bot initialized and polling');
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/projects/, (msg) => this.handleProjects(msg));
    this.bot.onText(/\/select (.+)/, (msg, match) => this.handleSelectProject(msg, match));
    this.bot.onText(/\/recce/, (msg) => this.handleCategorySelection(msg, 'recce'));
    this.bot.onText(/\/design/, (msg) => this.handleCategorySelection(msg, 'design'));
    this.bot.onText(/\/drawings/, (msg) => this.handleCategorySelection(msg, 'drawings'));
    this.bot.onText(/\/notes/, (msg) => this.handleCategorySelection(msg, 'notes'));
    this.bot.on('photo', (msg) => this.handlePhoto(msg));
    this.bot.on('document', (msg) => this.handleDocument(msg));
    // Handle simple number inputs for project selection
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    await this.createOrUpdateSession(userId, msg.from?.username, msg.from?.first_name);

    const welcomeMessage = `🏠 Welcome to Furnili Assistant!

I'll help you organize your project files efficiently.

📋 Commands:
• /projects - View all active projects
• /select [number] - Select a project

📁 Categories:
• /recce - Upload site photos with measurements
• /design - Upload design files
• /drawings - Upload technical drawings  
• /notes - Add text notes

Quick Start:
1. Type /projects
2. Select with /select [number]
3. Choose category and upload!`;

    await this.bot.sendMessage(chatId, welcomeMessage);
  }

  private async handleProjects(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      const projectList = await db
        .select({
          id: projects.id,
          code: projects.code,
          name: projects.name,
          stage: projects.stage,
          clientName: clients.name,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(projects.isActive, true))
        .orderBy(projects.createdAt);

      if (projectList.length === 0) {
        await this.bot.sendMessage(chatId, "No active projects found.");
        return;
      }

      let message = "📋 Active Projects:\n\n";
      projectList.forEach((project, index) => {
        message += `${index + 1}. ${project.code} - ${project.name}\n`;
        message += `   Client: ${project.clientName || 'Unknown'}\n`;
        message += `   Stage: ${project.stage}\n\n`;
      });
      message += "Reply with /select [number] to choose a project\nExample: /select 1";

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error fetching projects:', error);
      await this.bot.sendMessage(chatId, "Error fetching projects. Please try again.");
    }
  }

  private async handleSelectProject(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !match) return;

    const projectNumber = parseInt(match[1]);

    try {
      // Use raw SQL for better compatibility
      const client = await db.$client;
      const projectListResult = await client.query(`
        SELECT p.id, p.code, p.name, p.client_id, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.is_active = true
        ORDER BY p.created_at
      `);
      const projectList = projectListResult.rows;

      if (projectNumber < 1 || projectNumber > projectList.length) {
        await this.bot.sendMessage(chatId, `Invalid project number. Select between 1 and ${projectList.length}.`);
        return;
      }

      const selectedProject = projectList[projectNumber - 1];

      await client.query(
        'UPDATE telegram_user_sessions SET active_project_id = $2, active_client_id = $3, session_state = $4, last_interaction = NOW() WHERE telegram_user_id = $1',
        [userId, selectedProject.id, selectedProject.client_id, 'project_selected']
      );

      const message = `✅ Project Selected: ${selectedProject.code} - ${selectedProject.name}
Client: ${selectedProject.client_name || 'Unknown'}

📁 Choose upload category:
• /recce - Site photos with measurements
• /design - Design files
• /drawings - Technical drawings
• /notes - Text notes

Send the command and start uploading!`;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error selecting project:', error);
      await this.bot.sendMessage(chatId, "Error selecting project. Please try again.");
    }
  }

  // Handle simple text messages for project selection 
  private async handleMessage(msg: TelegramBot.Message) {
    // Skip if it's a command or already handled by other handlers
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || msg.photo || msg.document) return;

    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check if it's a simple number for project selection
    const projectNumber = parseInt(text);
    if (isNaN(projectNumber)) return;

    // Get current session state
    try {
      // Use raw SQL for better compatibility
      const client = await db.$client;
      const sessionResult = await client.query(
        'SELECT session_state FROM telegram_user_sessions WHERE telegram_user_id = $1',
        [userId]
      );

      // If user is in idle state and sent a number, treat as project selection
      if (sessionResult.rows.length > 0 && 
          (sessionResult.rows[0].session_state === 'idle' || !sessionResult.rows[0].session_state)) {
        // Simulate /select command
        await this.handleSelectProject(msg, [text, projectNumber.toString()]);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleCategorySelection(msg: TelegramBot.Message, category: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      // Use raw SQL for better compatibility
      const client = await db.$client;
      const sessionResult = await client.query(
        'SELECT * FROM telegram_user_sessions WHERE telegram_user_id = $1 LIMIT 1',
        [userId]
      );

      if (sessionResult.rows.length === 0 || !sessionResult.rows[0].active_project_id) {
        await this.bot.sendMessage(chatId, "⚠️ Please select a project first using /projects then /select [number]");
        return;
      }

      await client.query(
        'UPDATE telegram_user_sessions SET session_state = $2, current_step = $3, last_interaction = NOW() WHERE telegram_user_id = $1',
        [userId, 'uploading', category]
      );

      const messages: { [key: string]: string } = {
        recce: "📷 Recce Mode Active\n\nSend site photos with measurements.",
        design: "🎨 Design Mode Active\n\nSend design files and concepts.",
        drawings: "📐 Drawings Mode Active\n\nSend technical drawings and plans.",
        notes: "📝 Notes Mode Active\n\nSend text notes with attachments."
      };

      await this.bot.sendMessage(chatId, messages[category]);
    } catch (error) {
      console.error('Error handling category:', error);
      await this.bot.sendMessage(chatId, "Something went wrong. Please try again.");
    }
  }

  private async handlePhoto(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !msg.photo) return;

    try {
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId || session[0].sessionState !== 'uploading') {
        await this.bot.sendMessage(chatId, "⚠️ Please select project and category first.");
        return;
      }

      const userSession = session[0];
      const photo = msg.photo[msg.photo.length - 1];
      const caption = msg.caption || '';

      // Download and save photo
      const savedFile = await this.downloadFile(photo.file_id, 'photo', '.jpg');
      
      await db.insert(projectFiles).values({
        projectId: userSession.activeProjectId!,
        clientId: userSession.activeClientId,
        fileName: savedFile.fileName,
        originalName: `telegram_photo_${Date.now()}.jpg`,
        filePath: savedFile.filePath,
        fileSize: savedFile.fileSize,
        mimeType: 'image/jpeg',
        category: this.mapCategory(userSession.currentStep || 'general'),
        description: 'Uploaded via Telegram',
        comment: caption,
        uploadedBy: 1,
        isPublic: false,
      });

      await this.bot.sendMessage(chatId, `✅ Photo saved to ${this.getCategoryName(userSession.currentStep || 'general')}!${caption ? `\nComment: ${caption}` : ''}`);
    } catch (error) {
      console.error('Error handling photo:', error);
      await this.bot.sendMessage(chatId, "Error saving photo. Please try again.");
    }
  }

  private async handleDocument(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId || !msg.document) return;

    try {
      const session = await db
        .select()
        .from(telegramUserSessions)
        .where(eq(telegramUserSessions.telegramUserId, userId))
        .limit(1);

      if (session.length === 0 || !session[0].activeProjectId || session[0].sessionState !== 'uploading') {
        await this.bot.sendMessage(chatId, "⚠️ Please select project and category first.");
        return;
      }

      const userSession = session[0];
      const document = msg.document;
      const caption = msg.caption || '';

      // Download and save document
      const ext = path.extname(document.file_name || '.file');
      const savedFile = await this.downloadFile(document.file_id, 'document', ext);
      
      await db.insert(projectFiles).values({
        projectId: userSession.activeProjectId!,
        clientId: userSession.activeClientId,
        fileName: savedFile.fileName,
        originalName: document.file_name || 'telegram_file',
        filePath: savedFile.filePath,
        fileSize: document.file_size || 0,
        mimeType: document.mime_type || 'application/octet-stream',
        category: this.mapCategory(userSession.currentStep || 'general'),
        description: 'Uploaded via Telegram',
        comment: caption,
        uploadedBy: 1,
        isPublic: false,
      });

      await this.bot.sendMessage(chatId, `✅ File "${document.file_name}" saved!${caption ? `\nComment: ${caption}` : ''}`);
    } catch (error) {
      console.error('Error handling document:', error);
      await this.bot.sendMessage(chatId, "Error saving document. Please try again.");
    }
  }

  private async downloadFile(fileId: string, type: string, extension: string) {
    const fileInfo = await this.bot.getFile(fileId);
    const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    const uniqueName = crypto.randomBytes(8).toString('hex');
    const fileName = `telegram_${type}_${uniqueName}${extension}`;
    const filePath = `uploads/telegram/${fileName}`;

    // Ensure directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Download file
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const stats = fs.statSync(filePath);
    
    return {
      fileName,
      filePath,
      fileSize: stats.size
    };
  }

  private async createOrUpdateSession(userId: string, username?: string, firstName?: string) {
    try {
      console.log(`🔍 Creating/updating session for user ${userId}`);
      
      // Use raw SQL as backup - test direct connection
      const client = await db.$client;
      
      // First test the table exists
      const tableCheck = await client.query("SELECT 1 FROM telegram_user_sessions LIMIT 1");
      console.log(`✅ Table exists, found ${tableCheck.rowCount} rows`);
      
      // Check if session exists
      const existing = await client.query(
        'SELECT * FROM telegram_user_sessions WHERE telegram_user_id = $1 LIMIT 1',
        [userId]
      );

      if (existing.rows.length > 0) {
        console.log(`✅ Updating existing session for user ${userId}`);
        await client.query(
          'UPDATE telegram_user_sessions SET telegram_username = $2, telegram_first_name = $3, last_interaction = NOW(), updated_at = NOW() WHERE telegram_user_id = $1',
          [userId, username, firstName]
        );
      } else {
        console.log(`➕ Creating new session for user ${userId}`);
        await client.query(
          'INSERT INTO telegram_user_sessions (telegram_user_id, telegram_username, telegram_first_name, session_state) VALUES ($1, $2, $3, $4)',
          [userId, username, firstName, 'idle']
        );
      }
    } catch (error) {
      console.error('Error managing session:', error);
    }
  }

  private mapCategory(category: string): string {
    const mapping: { [key: string]: string } = {
      'recce': 'photos',
      'design': 'design', 
      'drawings': 'drawings',
      'notes': 'notes'
    };
    return mapping[category] || 'general';
  }

  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      'recce': 'Recce Photos',
      'design': 'Design Files',
      'drawings': 'Drawings',
      'notes': 'Notes'
    };
    return names[category] || 'General';
  }

  public stop() {
    this.bot.stopPolling();
  }
}