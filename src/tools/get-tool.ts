/**
 * Get Tool Implementation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GetToolConfig, GetToolParams } from '../config/types.js';
import { QueueManager } from '../queue/queue-manager.js';
import { QueueMincerTool } from './index.js';
import * as errorHandler from '../utils/error-handler.js';
import * as logger from '../utils/logger.js';

/**
 * Tool for getting items from the queue
 */
export class GetTool implements QueueMincerTool {
  private readonly name: string;
  private readonly description: string;
  private readonly directionExposed: boolean;
  private readonly defaultDirection: 'front' | 'back';
  
  constructor(
    private config: GetToolConfig,
    private queueManager: QueueManager
  ) {
    this.name = config.alias || 'get';
    this.description = config.description || 'Get the next item from the queue';
    this.directionExposed = config.directionExposed || false;
    this.defaultDirection = config.default || 'front';
  }
  
  /**
   * Get the name of the tool
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the description of the tool
   */
  getDescription(): string {
    return this.description;
  }
  
  /**
   * Get the input schema for the tool
   */
  getInputSchema(): any {
    // Define the schema based on configuration
    let schema = z.object({});
    
    // Add direction parameter if exposed
    if (this.directionExposed) {
      schema = schema.extend({
        direction: z.enum(['front', 'back']).optional().default(this.defaultDirection)
      });
    }
    
    // Convert to JSON schema
    return zodToJsonSchema(schema);
  }
  
  /**
   * Execute the tool with given parameters
   */
  async execute(params: GetToolParams): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    try {
      // Determine which direction to get from
      const direction = this.directionExposed
        ? (params.direction || this.defaultDirection)
        : this.defaultDirection;
      
      // Get the item asynchronously
      let item;
      if (direction === 'front') {
        item = await this.queueManager.getFront();
      } else {
        item = await this.queueManager.getBack();
      }
      
      // If no item was found, return a message
      if (item === null) {
        return errorHandler.createSuccessResponse('Queue is empty');
      }
      
      // Return the item as a JSON string
      return errorHandler.createSuccessResponse(JSON.stringify(item, null, 2));
    } catch (error) {
      logger.error(`Error executing ${this.name} tool`, error);
      return errorHandler.handleUnknownError(error);
    }
  }
} 