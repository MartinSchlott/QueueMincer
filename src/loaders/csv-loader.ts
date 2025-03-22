/**
 * CSV Loader Implementation
 */

import { QueueConfig } from '../config/types.js';
import { QueueLoader } from './index.js';
import * as logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';

/**
 * Path to templates directory
 */
const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

/**
 * Loader that reads items from CSV files
 */
export class CsvLoader implements QueueLoader {
  private initialized = false;
  private itemSchema: Record<string, string> | null = null;
  private cachedItems: any[] = [];
  private activeFile: string | null = null;
  
  constructor(private config: QueueConfig) {
    if (config.loader !== 'csv') {
      throw new Error('CsvLoader requires config.loader to be "csv"');
    }
  }
  
  /**
   * Initialize the CSV loader
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Ensure templates directory exists
    try {
      await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create templates directory', error);
      throw new Error('Failed to create templates directory');
    }
    
    // Load default template to infer schema if needed
    try {
      const files = await fs.readdir(TEMPLATES_DIR);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      if (csvFiles.length > 0) {
        const defaultFile = csvFiles[0];
        this.activeFile = defaultFile;
        const items = await this.loadCsvFile(defaultFile);
        
        if (items.length > 0 && !this.config.itemTemplate) {
          this.itemSchema = this.inferSchema(items[0]);
        }
        
        // Cache items if in-memory mode is enabled
        if (this.config.inMemory) {
          this.cachedItems = items;
        }
      }
    } catch (error) {
      logger.warn('Could not load default template', error);
    }
    
    // Use configured schema if provided
    if (this.config.itemTemplate) {
      this.itemSchema = this.config.itemTemplate;
    }
    
    this.initialized = true;
    logger.info('CSV loader initialized');
  }
  
  /**
   * Get all items from the default source
   */
  async getItems(): Promise<any[]> {
    if (this.config.inMemory) {
      return [...this.cachedItems];
    }
    
    // If no active file, load from the first available CSV file
    if (!this.activeFile) {
      try {
        const files = await fs.readdir(TEMPLATES_DIR);
        const csvFiles = files.filter(file => file.endsWith('.csv'));
        
        if (csvFiles.length > 0) {
          this.activeFile = csvFiles[0];
          return await this.loadCsvFile(csvFiles[0]);
        }
      } catch (error) {
        logger.error('Failed to load items', error);
      }
      
      return [];
    }
    
    // Load from active file
    return await this.loadCsvFile(this.activeFile);
  }
  
  /**
   * Load items from a specific template
   */
  async loadTemplate(templateId: string): Promise<any[]> {
    const filename = this.getFilenameFromTemplateId(templateId);
    this.activeFile = filename;
    
    try {
      const items = await this.loadCsvFile(filename);
      
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
   * Check if a template exists
   */
  async hasTemplate(templateId: string): Promise<boolean> {
    const filename = this.getFilenameFromTemplateId(templateId);
    const filepath = path.join(TEMPLATES_DIR, filename);
    
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
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
    // If we're working with in-memory mode, just update the cache
    if (this.config.inMemory) {
      this.cachedItems = [...items];
      return;
    }
    
    // If no active file, create one
    if (!this.activeFile) {
      this.activeFile = 'queue.csv';
    }
    
    // Save to the active file
    await this.saveCsvFile(this.activeFile, items);
    logger.debug(`Saved ${items.length} items to ${this.activeFile}`);
  }
  
  /**
   * Add a single item to the source at the front
   */
  async addItemFront(item: any): Promise<void> {
    // If working in-memory, delegate to memory operations
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
    // If working in-memory, delegate to memory operations
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
    // If working in-memory, delegate to memory operations
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
    // If working in-memory, delegate to memory operations
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
   * Load and parse a CSV file
   */
  private loadCsvFile(filename: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const filepath = path.join(TEMPLATES_DIR, filename);
      const results: any[] = [];
      
      createReadStream(filepath)
        .pipe(csv())
        .on('data', (data) => results.push(this.convertTypes(data)))
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          logger.error(`Failed to load CSV file: ${filename}`, error);
          reject(new Error(`Failed to load CSV file: ${filename}`));
        });
    });
  }
  
  /**
   * Save data to a CSV file
   */
  private async saveCsvFile(filename: string, data: any[]): Promise<void> {
    if (data.length === 0) {
      // If empty, write an empty file or with headers only
      await fs.writeFile(path.join(TEMPLATES_DIR, filename), '', 'utf-8');
      return;
    }
    
    try {
      // Extract headers from the first object
      const headers = Object.keys(data[0]);
      
      // Convert objects to arrays for CSV stringification
      const rows = data.map(item => {
        return headers.map(header => item[header]);
      });
      
      // Insert headers at the beginning
      rows.unshift(headers);
      
      // Convert to CSV format
      const csvData = stringify(rows);
      
      // Write to file
      await fs.writeFile(path.join(TEMPLATES_DIR, filename), csvData, 'utf-8');
    } catch (error) {
      logger.error(`Failed to save CSV file: ${filename}`, error);
      throw new Error(`Failed to save CSV file: ${filename}`);
    }
  }
  
  /**
   * Try to convert string values to appropriate types
   */
  private convertTypes(row: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(row)) {
      // Try to convert to number
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        result[key] = parseFloat(value);
      }
      // Try to convert to boolean
      else if (value.toLowerCase() === 'true') {
        result[key] = true;
      }
      else if (value.toLowerCase() === 'false') {
        result[key] = false;
      }
      // Keep as string
      else {
        result[key] = value;
      }
    }
    
    return result;
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
  
  /**
   * Convert template ID to filename
   */
  private getFilenameFromTemplateId(templateId: string): string {
    // Ensure the template ID has .csv extension
    return templateId.endsWith('.csv') ? templateId : `${templateId}.csv`;
  }
} 