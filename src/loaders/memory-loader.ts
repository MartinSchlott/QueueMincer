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
} 