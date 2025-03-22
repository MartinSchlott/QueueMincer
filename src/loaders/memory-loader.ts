/**
 * Memory Loader Implementation
 */

import { QueueConfig } from '../config/types.js';
import { QueueLoader } from './index.js';
import * as logger from '../utils/logger.js';

/**
 * Loader that maintains items only in memory
 */
export class MemoryLoader implements QueueLoader {
  private initialized = false;
  private items: any[] = [];
  
  constructor(private config: QueueConfig) {
    if (config.loader !== 'memory') {
      throw new Error('MemoryLoader requires config.loader to be "memory"');
    }
    
    if (!config.put) {
      throw new Error('MemoryLoader requires config.put to be true');
    }
  }
  
  /**
   * Initialize the memory loader
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Memory loader doesn't need special initialization
    this.initialized = true;
    logger.info('Memory loader initialized');
  }
  
  /**
   * Get all items from memory
   */
  async getItems(): Promise<any[]> {
    // Return a copy of the items to prevent external modification
    return [...this.items];
  }
  
  /**
   * Load items from a template - for memory loader this resets to empty state
   */
  async loadTemplate(templateId: string): Promise<any[]> {
    // For memory loader, template ID is ignored and we just reset to empty
    logger.info('Memory loader reset (templateId ignored)');
    this.items = [];
    return this.items;
  }
  
  /**
   * Check if a template exists - always returns true for memory loader
   */
  async hasTemplate(templateId: string): Promise<boolean> {
    // Memory loader always considers any template to exist (and ignores it)
    return true;
  }
  
  /**
   * Get the item schema from configuration
   */
  getItemSchema(): Record<string, string> | null {
    return this.config.itemTemplate || null;
  }
  
  /**
   * Save the complete list of items to the source
   */
  async saveItems(items: any[]): Promise<void> {
    // For memory loader, just replace the internal array
    this.items = [...items];
    logger.debug(`Memory loader saved ${items.length} items`);
  }
  
  /**
   * Add a single item to the source at the front
   */
  async addItemFront(item: any): Promise<void> {
    // Add item to the front of the array
    this.items.unshift(item);
    logger.debug('Memory loader added item to front');
  }
  
  /**
   * Add a single item to the source at the back
   */
  async addItemBack(item: any): Promise<void> {
    // Add item to the back of the array
    this.items.push(item);
    logger.debug('Memory loader added item to back');
  }
  
  /**
   * Remove and return an item from the front of the source
   */
  async removeItemFront(): Promise<any | null> {
    if (this.items.length === 0) {
      return null;
    }
    
    // Remove and return first item
    return this.items.shift() || null;
  }
  
  /**
   * Remove and return an item from the back of the source
   */
  async removeItemBack(): Promise<any | null> {
    if (this.items.length === 0) {
      return null;
    }
    
    // Remove and return last item
    return this.items.pop() || null;
  }
} 