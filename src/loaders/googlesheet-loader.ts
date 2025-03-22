/**
 * Google Sheet Loader Implementation
 */

import { QueueConfig } from '../config/types.js';
import { QueueLoader } from './index.js';
import * as logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { google, sheets_v4 } from 'googleapis';

/**
 * Path to credentials file
 */
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Loader that reads items from Google Sheets
 */
export class GoogleSheetLoader implements QueueLoader {
  private initialized = false;
  private itemSchema: Record<string, string> | null = null;
  private cachedItems: any[] = [];
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string | null = null;
  private availableSheets: string[] = [];
  
  constructor(private config: QueueConfig) {
    if (config.loader !== 'googleSheet') {
      throw new Error('GoogleSheetLoader requires config.loader to be "googleSheet"');
    }
  }
  
  /**
   * Initialize the Google Sheet loader
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Check if credentials file exists
      try {
        await fs.access(CREDENTIALS_PATH);
      } catch {
        logger.error('Google Sheet credentials file not found. Please create credentials.json in the root directory.');
        throw new Error('Google Sheet credentials file not found');
      }
      
      // Load credentials
      const credentialsContent = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
      const credentials = JSON.parse(credentialsContent);
      
      // Extract spreadsheet ID from credentials
      if (!credentials.spreadsheetId) {
        throw new Error('Missing spreadsheetId in credentials.json');
      }
      this.spreadsheetId = credentials.spreadsheetId;
      
      // Initialize Google Sheets API
      const auth = await this.getAuth(credentials);
      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Get available sheets
      if (!this.spreadsheetId) {
        throw new Error('Spreadsheet ID not set');
      }
      
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      // Extract sheets
      if (response.data && response.data.sheets) {
        this.availableSheets = response.data.sheets
          .map((sheet: any) => sheet.properties?.title || '')
          .filter(Boolean);
        logger.debug(`Available sheets: ${this.availableSheets.join(', ')}`);
      }
      
      // Load first sheet if any exists
      if (this.availableSheets.length > 0) {
        const defaultSheet = this.availableSheets[0];
        const items = await this.loadSheet(defaultSheet);
        
        if (items.length > 0 && !this.config.itemTemplate) {
          this.itemSchema = this.inferSchema(items[0]);
        }
        
        // Cache items if in-memory mode is enabled
        if (this.config.inMemory) {
          this.cachedItems = items;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Google Sheet loader', error);
      throw new Error('Failed to initialize Google Sheet loader');
    }
    
    // Use configured schema if provided
    if (this.config.itemTemplate) {
      this.itemSchema = this.config.itemTemplate;
    }
    
    this.initialized = true;
    logger.info('Google Sheet loader initialized');
  }
  
  /**
   * Get all items from the default source
   */
  async getItems(): Promise<any[]> {
    if (this.config.inMemory) {
      return [...this.cachedItems];
    }
    
    // If no default sheet is available, return empty array
    if (this.availableSheets.length === 0) {
      return [];
    }
    
    // Load from first available sheet
    try {
      return await this.loadSheet(this.availableSheets[0]);
    } catch (error) {
      logger.error('Failed to load items from Google Sheet', error);
      return [];
    }
  }
  
  /**
   * Load items from a specific template (sheet name)
   */
  async loadTemplate(templateId: string): Promise<any[]> {
    try {
      const items = await this.loadSheet(templateId);
      
      // Update cached items if in-memory mode is enabled
      if (this.config.inMemory) {
        this.cachedItems = items;
      }
      
      return items;
    } catch (error) {
      logger.error(`Failed to load template: ${templateId}`, error);
      throw new Error(`Failed to load template: ${templateId}`);
    }
  }
  
  /**
   * Check if a template (sheet) exists
   */
  async hasTemplate(templateId: string): Promise<boolean> {
    return this.availableSheets.includes(templateId);
  }
  
  /**
   * Get the item schema
   */
  getItemSchema(): Record<string, string> | null {
    return this.itemSchema;
  }
  
  /**
   * Get authentication for Google Sheets API
   */
  private async getAuth(credentials: any): Promise<any> {
    // Handle API key authentication
    if (credentials.apiKey) {
      return credentials.apiKey;
    }
    
    // Handle OAuth2 authentication
    if (credentials.client_email && credentials.private_key) {
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      // Verify authentication
      await auth.authorize();
      return auth;
    }
    
    throw new Error('Invalid credentials format. Please provide apiKey or client_email/private_key');
  }
  
  /**
   * Load data from a specific sheet
   */
  private async loadSheet(sheetName: string): Promise<any[]> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error('Google Sheets API not initialized');
    }
    
    try {
      // Get sheet data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: sheetName
      });
      
      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        return [];
      }
      
      // First row is headers
      const headers = rows[0];
      
      // Convert remaining rows to objects
      return rows.slice(1).map(row => {
        const item: Record<string, any> = {};
        
        // Map each column to its header
        headers.forEach((header, index) => {
          if (index < row.length) {
            // Convert values to appropriate types
            let value = row[index];
            
            // Try to convert to number
            if (/^-?\d+(\.\d+)?$/.test(value)) {
              value = parseFloat(value);
            }
            // Try to convert to boolean
            else if (value.toLowerCase() === 'true') {
              value = true;
            }
            else if (value.toLowerCase() === 'false') {
              value = false;
            }
            
            item[header] = value;
          } else {
            // If value is missing, set as null
            item[header] = null;
          }
        });
        
        return item;
      });
    } catch (error) {
      logger.error(`Failed to load sheet: ${sheetName}`, error);
      throw new Error(`Failed to load sheet: ${sheetName}`);
    }
  }
  
  /**
   * Infer schema from an item
   */
  private inferSchema(item: any): Record<string, string> {
    const schema: Record<string, string> = {};
    
    if (typeof item === 'object' && item !== null) {
      for (const [key, value] of Object.entries(item)) {
        schema[key] = typeof value;
      }
    }
    
    return schema;
  }
} 