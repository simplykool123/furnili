import TelegramBot from 'node-telegram-bot-api';
import { Pool } from 'pg';
import { telegramUserSessions, projects, clients, projectFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Force use exact same connection as main app
const SUPABASE_DATABASE_URL = "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const botPool = new Pool({ 
  connectionString: SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// In-memory user tracking (simple solution)
const userModes = new Map<string, string>();
const userProjects = new Map<string, number>();

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
      // Use direct database connection like other methods
      const client = await botPool.connect();
      try {
        const result = await client.query(`
          SELECT p.id, p.code, p.name, p.stage, c.name as client_name
          FROM projects p
          LEFT JOIN clients c ON p.client_id = c.id
          WHERE p.is_active = true
          ORDER BY p.created_at
        `);
        const projectList = result.rows;

      if (projectList.length === 0) {
        await this.bot.sendMessage(chatId, "No active projects found.");
        return;
      }

        let message = "📋 Active Projects:\n\n";
        projectList.forEach((project, index) => {
          message += `${index + 1}. ${project.code} - ${project.name}\n`;
          message += `   Client: ${project.client_name || 'Unknown'}\n`;
          message += `   Stage: ${project.stage}\n\n`;
        });
        message += "Reply with /select [number] to choose a project\nExample: /select 1";

        await this.bot.sendMessage(chatId, message);
      } finally {
        client.release();
      }
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
      // Use dedicated bot pool with exact same connection
      const client = await botPool.connect();
      
      try {
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

        // Store selected project for this user
        userProjects.set(userId, selectedProject.id);
        
        // Skip session update - just log the selection  
        console.log(`✅ User ${userId} selected project: ${selectedProject.code} (ID: ${selectedProject.id})`);
        console.log(`📝 Debug: Stored project ${selectedProject.id} for user ${userId}`);

        const message = `✅ Project Selected: ${selectedProject.code} - ${selectedProject.name}
Client: ${selectedProject.client_name || 'Unknown'}

📁 Choose upload category:
• /recce - Site photos with measurements
• /design - Design files
• /drawings - Technical drawings
• /notes - Text notes

Send the command and start uploading!`;

        await this.bot.sendMessage(chatId, message);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      await this.bot.sendMessage(chatId, "Error selecting project. Please try again.");
    }
  }

  // Handle simple text messages for project selection and notes
  private async handleMessage(msg: TelegramBot.Message) {
    // Skip if it's a command or already handled by other handlers
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || msg.photo || msg.document) return;

    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    // Check if it's a simple number for project selection
    const projectNumber = parseInt(text);
    if (!isNaN(projectNumber)) {
      try {
        // Use dedicated bot pool with exact same connection
        const client = await botPool.connect();
        
        try {
          // Skip session check - just handle number as project selection
          console.log(`📱 User ${userId} typed number: ${projectNumber}`);
          
          // Simulate /select command for any number input
          await this.handleSelectProject(msg, [text, projectNumber.toString()]);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
      return;
    }

    // Handle text notes if user is in notes mode
    const currentMode = userModes.get(userId);
    if (currentMode === 'notes') {
      await this.handleTextNote(msg, text);
    }
  }

  private async handleTextNote(msg: TelegramBot.Message, noteText: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      const projectId = userProjects.get(userId) || 1;
      console.log(`📝 User ${userId} saving text note to project ${projectId}`);
      console.log(`🔍 Debug: userProjects map has ${userProjects.size} entries, user ${userId} maps to ${userProjects.get(userId)}`);

      // Save text note to database
      const client = await botPool.connect();
      try {
        await client.query(
          'INSERT INTO project_files (project_id, client_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            projectId,
            1, // default client
            `telegram_note_${Date.now()}.txt`,
            `telegram_note_${Date.now()}.txt`,
            '', // No file path for text notes
            noteText.length, // Text length as file size
            'text/plain',
            'notes', // notes category
            'Text note via Telegram',
            noteText, // The actual note content
            7, // Use existing user ID
            false
          ]
        );
      } finally {
        client.release();
      }

      await this.bot.sendMessage(chatId, `✅ Note saved successfully!\n"${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}"`);
    } catch (error) {
      console.error('Error handling text note:', error);
      await this.bot.sendMessage(chatId, "Error saving note. Please try again.");
    }
  }

  private async handleCategorySelection(msg: TelegramBot.Message, category: string) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    if (!userId) return;

    try {
      // Store user's current mode in memory
      userModes.set(userId, category);
      console.log(`📁 User ${userId} selected category: ${category}`);

      const messages: { [key: string]: string } = {
        recce: "📷 Recce Mode Active\n\nSend site photos with measurements.",
        design: "🎨 Design Mode Active\n\nSend design files and concepts.",
        drawings: "📐 Drawings Mode Active\n\nSend technical drawings and plans.",
        notes: "📝 Notes Mode Active\n\nSend text notes or attachments."
      };

      await this.bot.sendMessage(chatId, messages[category] || "Upload mode active. Send your files!");
      
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
      // Skip session check - save photo directly to default project (ID 1)
      const projectId = userProjects.get(userId) || 1;
      const photo = msg.photo[msg.photo.length - 1];
      const caption = msg.caption || '';

      console.log(`📸 User ${userId} uploading photo to project ${projectId}`);
      console.log(`🔍 Debug: userProjects map has ${userProjects.size} entries, user ${userId} maps to ${userProjects.get(userId)}`);

      // Download and save photo locally
      const savedFile = await this.downloadFile(photo.file_id, 'photo', '.jpg');
      
      // Get user's current mode to determine category
      const currentMode = userModes.get(userId) || 'recce';
      const category = this.mapCategory(currentMode);

      // Save to database using direct query (LOCAL STORAGE as per user requirements)
      const client = await botPool.connect();
      try {
        await client.query(
          'INSERT INTO project_files (project_id, client_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            projectId,
            1, // default client
            savedFile.fileName,
            `telegram_photo_${Date.now()}.jpg`,
            savedFile.filePath,
            savedFile.fileSize,
            'image/jpeg',
            category, // Use correct category based on user mode
            'Uploaded via Telegram',
            caption,
            7, // Use existing user ID (Aman from logs)
            false
          ]
        );
      } finally {
        client.release();
      }

      await this.bot.sendMessage(chatId, `✅ Photo saved successfully!${caption ? `\nComment: ${caption}` : ''}`);
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
      const projectId = userProjects.get(userId) || 1;
      const document = msg.document;
      const caption = msg.caption || '';

      console.log(`📄 User ${userId} uploading document to project ${projectId}`);
      console.log(`🔍 Debug: userProjects map has ${userProjects.size} entries, user ${userId} maps to ${userProjects.get(userId)}`);

      // Download and save document locally (LOCAL STORAGE per user requirements)  
      const ext = path.extname(document.file_name || '.file');
      const savedFile = await this.downloadFile(document.file_id, 'document', ext);

      // Get user's current mode to determine category
      const currentMode = userModes.get(userId) || 'notes';
      const category = this.mapCategory(currentMode);

      // Save document metadata to database using direct query
      const client = await botPool.connect();
      try {
        await client.query(
          'INSERT INTO project_files (project_id, client_id, file_name, original_name, file_path, file_size, mime_type, category, description, comment, uploaded_by, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            projectId,
            1, // default client
            savedFile.fileName,
            document.file_name || 'telegram_file',
            savedFile.filePath,
            document.file_size || 0,
            document.mime_type || 'application/octet-stream',
            category, // Use correct category based on user mode
            'Uploaded via Telegram',
            caption,
            7, // Use existing user ID
            false
          ]
        );
      } finally {
        client.release();
      }

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
    const filePath = `uploads/projects/${fileName}`;

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
      
      // Use dedicated bot pool with exact same connection
      const client = await botPool.connect();
      
      try {
      
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
      } finally {
        client.release();
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