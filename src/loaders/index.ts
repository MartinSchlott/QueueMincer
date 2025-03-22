/**
 * Queue Loader - Interface and factory for different loader types
 */

import { QueueConfig } from '../config/types.js';
import * as logger from '../utils/logger.js';
import { MemoryLoader } from './memory-loader.js';
import { JsonLoader } from './json-loader.js';
import { CsvLoader } from './csv-loader.js';
import { GoogleSheetLoader } from './googlesheet-loader.js';

/**
 * Common interface for all queue loaders
 */
export interface QueueLoader {
  /**
   * Initialize the loader
   */
  initialize(): Promise<void>;
  
  /**
   * Get all items from the source
   */
  getItems(): Promise<any[]>;
  
  /**
   * Load items from a specific template
   */
  loadTemplate(templateId: string): Promise<any[]>;
  
  /**
   * Check if a template exists
   */
  hasTemplate(templateId: string): Promise<boolean>;
  
  /**
   * Get the item schema if available
   */
  getItemSchema(): Record<string, string> | null;
}

/**
 * Creates the appropriate loader based on configuration
 * @param config The queue configuration
 * @returns A QueueLoader instance
 */
export function createLoader(config: QueueConfig): QueueLoader {
  switch (config.loader) {
    case 'memory':
      return new MemoryLoader(config);
    case 'json':
      return new JsonLoader(config);
    case 'csv':
      return new CsvLoader(config);
    case 'googleSheet':
      return new GoogleSheetLoader(config);
    default:
      // This should never happen due to TypeScript, but as a fallback:
      logger.error(`Unknown loader type: ${config.loader}`);
      throw new Error(`Unknown loader type: ${config.loader}`);
  }
} 