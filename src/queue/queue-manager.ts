/**
 * Queue Manager - Core queue operations and state management
 */

import { QueueConfig } from '../config/types.js';
import { QueueLoader } from '../loaders/index.js';
import * as logger from '../utils/logger.js';

export interface QueueManager {
  /**
   * Initialize the queue
   */
  initialize(): Promise<void>;
  
  /**
   * Get the next item from the front of the queue
   */
  getFront(): any | null;
  
  /**
   * Get the next item from the back of the queue
   */
  getBack(): any | null;
  
  /**
   * Add an item to the front of the queue
   */
  pushFront(item: any): Promise<void>;
  
  /**
   * Add an item to the back of the queue
   */
  pushBack(item: any): Promise<void>;
  
  /**
   * Replace all items with items from template
   */
  replaceFromTemplate(templateId: string): Promise<void>;
  
  /**
   * Add items from template to the front
   */
  addFrontFromTemplate(templateId: string): Promise<void>;
  
  /**
   * Add items from template to the back
   */
  addBackFromTemplate(templateId: string): Promise<void>;
  
  /**
   * Validate an item against the current schema
   */
  validateItem(item: any): boolean;
}

/**
 * Default Queue Manager Implementation
 */
export class DefaultQueueManager implements QueueManager {
  private items: any[] = [];
  private initialized = false;
  private itemTemplate: Record<string, string> | null = null;

  constructor(
    private config: QueueConfig,
    private loader: QueueLoader
  ) {}

  /**
   * Initialize the queue by loading items from the source if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loader.initialize();
    
    // Get item schema from loader or configuration
    this.itemTemplate = this.loader.getItemSchema() || this.config.itemTemplate || null;
    
    // Load initial items if needed
    if (this.config.inMemory) {
      this.items = await this.loader.getItems();
    }
    
    this.initialized = true;
    logger.info(`Queue initialized with ${this.items.length} items in memory`);
  }

  /**
   * Get the next item from the front of the queue
   */
  getFront(): any | null {
    if (!this.config.inMemory) {
      throw new Error('Cannot get items directly when inMemory is false');
    }
    
    if (this.items.length === 0) {
      return null;
    }
    
    return this.items.shift() || null;
  }

  /**
   * Get the next item from the back of the queue
   */
  getBack(): any | null {
    if (!this.config.inMemory) {
      throw new Error('Cannot get items directly when inMemory is false');
    }
    
    if (this.items.length === 0) {
      return null;
    }
    
    return this.items.pop() || null;
  }

  /**
   * Add an item to the front of the queue
   */
  async pushFront(item: any): Promise<void> {
    if (this.config.loader === 'memory' && !this.config.put) {
      throw new Error('Cannot push items when put is not enabled');
    }
    
    // Validate the item
    if (!this.validateItem(item)) {
      throw new Error('Item does not match the required schema');
    }
    
    if (this.config.inMemory) {
      this.items.unshift(item);
    }
  }

  /**
   * Add an item to the back of the queue
   */
  async pushBack(item: any): Promise<void> {
    if (this.config.loader === 'memory' && !this.config.put) {
      throw new Error('Cannot push items when put is not enabled');
    }
    
    // Validate the item
    if (!this.validateItem(item)) {
      throw new Error('Item does not match the required schema');
    }
    
    if (this.config.inMemory) {
      this.items.push(item);
    }
  }

  /**
   * Replace all items with items from template
   */
  async replaceFromTemplate(templateId: string): Promise<void> {
    if (!await this.loader.hasTemplate(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const newItems = await this.loader.loadTemplate(templateId);
    
    if (this.config.inMemory) {
      this.items = newItems;
    }
  }

  /**
   * Add items from template to the front
   */
  async addFrontFromTemplate(templateId: string): Promise<void> {
    if (!await this.loader.hasTemplate(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const newItems = await this.loader.loadTemplate(templateId);
    
    if (this.config.inMemory) {
      this.items.unshift(...newItems);
    }
  }

  /**
   * Add items from template to the back
   */
  async addBackFromTemplate(templateId: string): Promise<void> {
    if (!await this.loader.hasTemplate(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const newItems = await this.loader.loadTemplate(templateId);
    
    if (this.config.inMemory) {
      this.items.push(...newItems);
    }
  }

  /**
   * Validate an item against the current schema
   */
  validateItem(item: any): boolean {
    // If no item template is defined, any item is valid
    if (!this.itemTemplate) {
      return true;
    }
    
    // Check that item is an object
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    
    // Validate each field against the template
    for (const [key, type] of Object.entries(this.itemTemplate)) {
      // Check if property exists
      if (!(key in item)) {
        return false;
      }
      
      // Check property type
      const value = item[key];
      switch (type.toLowerCase()) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number') return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) return false;
          break;
        case 'array':
          if (!Array.isArray(value)) return false;
          break;
        // Add more types as needed
        default:
          // Unknown type - assume it's valid
          break;
      }
    }
    
    return true;
  }
} 