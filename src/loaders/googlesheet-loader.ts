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
  private activeSheet: string | null = null;
  
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
        this.activeSheet = defaultSheet;
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
    
    // If no active sheet is set, use the first available one
    if (!this.activeSheet && this.availableSheets.length > 0) {
      this.activeSheet = this.availableSheets[0];
    }
    
    // If no active sheet is available, return empty array
    if (!this.activeSheet) {
      return [];
    }
    
    // Load from active sheet
    try {
      return await this.loadSheet(this.activeSheet);
    } catch (error) {
      logger.error('Failed to load items from Google Sheet', error);
      return [];
    }
  }
  
  /**
   * Load items from a specific template (sheet name)
   */
  async loadTemplate(templateId: string): Promise<any[]> {
    // Check if the sheet exists
    if (!this.availableSheets.includes(templateId)) {
      throw new Error(`Sheet ${templateId} not found`);
    }
    
    // Set active sheet
    this.activeSheet = templateId;
    
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
   * Save the complete list of items to the source
   */
  async saveItems(items: any[]): Promise<void> {
    // If in-memory mode, just update the cache
    if (this.config.inMemory) {
      this.cachedItems = [...items];
      return;
    }
    
    // If no active sheet is set, use the first available one or create a new one
    if (!this.activeSheet) {
      if (this.availableSheets.length > 0) {
        this.activeSheet = this.availableSheets[0];
      } else {
        this.activeSheet = 'Sheet1';
        await this.createSheet(this.activeSheet);
      }
    }
    
    // Write to the active sheet
    await this.writeSheet(this.activeSheet, items);
    logger.debug(`Saved ${items.length} items to Google Sheet: ${this.activeSheet}`);
  }
  
  /**
   * Add a single item to the source at the front
   */
  async addItemFront(item: any): Promise<void> {
    // If in-memory mode, just update the cache
    if (this.config.inMemory) {
      this.cachedItems.unshift(item);
      return;
    }
    
    // Otherwise, load all items, add the new one, and save back
    const items = await this.getItems();
    items.unshift(item);
    await this.saveItems(items);
  }
  
  /**
   * Add a single item to the source at the back
   */
  async addItemBack(item: any): Promise<void> {
    // If in-memory mode, just update the cache
    if (this.config.inMemory) {
      this.cachedItems.push(item);
      return;
    }
    
    // Otherwise, load all items, add the new one, and save back
    const items = await this.getItems();
    items.push(item);
    await this.saveItems(items);
  }
  
  /**
   * Remove and return an item from the front of the source
   */
  async removeItemFront(): Promise<any | null> {
    // If in-memory mode, operate on the cache
    if (this.config.inMemory) {
      if (this.cachedItems.length === 0) {
        return null;
      }
      return this.cachedItems.shift() || null;
    }
    
    // Otherwise, load all items, remove the first one, and save back
    const items = await this.getItems();
    if (items.length === 0) {
      return null;
    }
    
    const item = items.shift();
    await this.saveItems(items);
    return item;
  }
  
  /**
   * Remove and return an item from the back of the source
   */
  async removeItemBack(): Promise<any | null> {
    // If in-memory mode, operate on the cache
    if (this.config.inMemory) {
      if (this.cachedItems.length === 0) {
        return null;
      }
      return this.cachedItems.pop() || null;
    }
    
    // Otherwise, load all items, remove the last one, and save back
    const items = await this.getItems();
    if (items.length === 0) {
      return null;
    }
    
    const item = items.pop();
    await this.saveItems(items);
    return item;
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
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
   * Create a new sheet in the spreadsheet
   */
  private async createSheet(sheetName: string): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error('Google Sheets API not initialized');
    }
    
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        }
      });
      
      // Add to available sheets
      if (!this.availableSheets.includes(sheetName)) {
        this.availableSheets.push(sheetName);
      }
      
      logger.debug(`Created new sheet: ${sheetName}`);
    } catch (error) {
      logger.error(`Failed to create sheet: ${sheetName}`, error);
      throw new Error(`Failed to create sheet: ${sheetName}`);
    }
  }
  
  /**
   * Write data to a sheet
   */
  private async writeSheet(sheetName: string, data: any[]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) {
      throw new Error('Google Sheets API not initialized');
    }
    
    try {
      // Clear existing sheet content
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: sheetName
      });
      
      if (data.length === 0) {
        // If no data, nothing to write
        return;
      }
      
      // Extract headers from the first object
      const headers = Object.keys(data[0]);
      
      // Prepare rows (starting with headers)
      const rows = [headers];
      
      // Add data rows
      for (const item of data) {
        const row = headers.map(header => {
          const value = item[header];
          
          // Convert values to string for sheets
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'object') {
            return JSON.stringify(value);
          } else {
            return String(value);
          }
        });
        
        rows.push(row);
      }
      
      // Write to sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });
      
      logger.debug(`Updated sheet: ${sheetName} with ${data.length} items`);
    } catch (error) {
      logger.error(`Failed to write sheet: ${sheetName}`, error);
      throw new Error(`Failed to write sheet: ${sheetName}`);
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