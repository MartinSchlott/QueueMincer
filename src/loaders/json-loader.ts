/**
 * JSON Loader Implementation
 */

import { QueueConfig } from '../config/types.js';
import { QueueLoader } from './index.js';
import * as logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Path to templates directory
 */
const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

/**
 * Loader that reads items from JSON files
 */
export class JsonLoader implements QueueLoader {
  private initialized = false;
  private itemSchema: Record<string, string> | null = null;
  private cachedItems: any[] = [];
  private activeFile: string | null = null;
  
  constructor(private config: QueueConfig) {
    if (config.loader !== 'json') {
      throw new Error('JsonLoader requires config.loader to be "json"');
    }
  }
  
  /**
   * Initialize the JSON loader
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
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length > 0) {
        const defaultFile = jsonFiles[0];
        this.activeFile = defaultFile;
        const items = await this.loadJsonFile(defaultFile);
        
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
    logger.info('JSON loader initialized');
  }
  
  /**
   * Get all items from the default source
   */
  async getItems(): Promise<any[]> {
    if (this.config.inMemory) {
      return [...this.cachedItems];
    }
    
    // If no active file, load from the first available JSON file
    if (!this.activeFile) {
      try {
        const files = await fs.readdir(TEMPLATES_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          this.activeFile = jsonFiles[0];
          return await this.loadJsonFile(jsonFiles[0]);
        }
      } catch (error) {
        logger.error('Failed to load items', error);
      }
      
      return [];
    }
    
    // Load from active file
    return await this.loadJsonFile(this.activeFile);
  }
  
  /**
   * Load items from a specific template
   */
  async loadTemplate(templateId: string): Promise<any[]> {
    const filename = this.getFilenameFromTemplateId(templateId);
    this.activeFile = filename;
    
    try {
      const items = await this.loadJsonFile(filename);
      
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
      this.activeFile = 'queue.json';
    }
    
    // Save to the active file
    await this.saveJsonFile(this.activeFile, items);
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
   * Load and parse a JSON file
   */
  private async loadJsonFile(filename: string): Promise<any[]> {
    const filepath = path.join(TEMPLATES_DIR, filename);
    
    try {
      const data = await fs.readFile(filepath, 'utf-8');
      const parsed = JSON.parse(data);
      
      if (!Array.isArray(parsed)) {
        throw new Error(`File ${filename} does not contain an array`);
      }
      
      return parsed;
    } catch (error) {
      logger.error(`Failed to load JSON file: ${filename}`, error);
      throw new Error(`Failed to load JSON file: ${filename}`);
    }
  }
  
  /**
   * Save data to a JSON file
   */
  private async saveJsonFile(filename: string, data: any[]): Promise<void> {
    const filepath = path.join(TEMPLATES_DIR, filename);
    
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filepath, jsonData, 'utf-8');
    } catch (error) {
      logger.error(`Failed to save JSON file: ${filename}`, error);
      throw new Error(`Failed to save JSON file: ${filename}`);
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
  
  /**
   * Convert template ID to filename
   */
  private getFilenameFromTemplateId(templateId: string): string {
    // Ensure the template ID has .json extension
    return templateId.endsWith('.json') ? templateId : `${templateId}.json`;
  }
} 