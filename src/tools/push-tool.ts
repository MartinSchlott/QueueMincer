/**
 * Push Tool Implementation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PushToolConfig, PushToolParams } from '../config/types.js';
import { QueueManager } from '../queue/queue-manager.js';
import { QueueMincerTool } from './index.js';
import * as errorHandler from '../utils/error-handler.js';
import * as logger from '../utils/logger.js';

/**
 * Tool for adding items to the queue
 */
export class PushTool implements QueueMincerTool {
  private readonly name: string;
  private readonly description: string;
  private readonly directionExposed: boolean;
  private readonly defaultDirection: 'front' | 'back';
  
  constructor(
    private config: PushToolConfig,
    private queueManager: QueueManager
  ) {
    this.name = config.alias || 'push';
    this.description = config.description || 'Add an item to the queue';
    this.directionExposed = config.directionExposed || true;
    this.defaultDirection = config.default || 'back';
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
    // Build item schema based on queue's item template
    let itemSchema: z.ZodTypeAny;
    
    // Get item schema from QueueManager
    const queueItemSchema = (this.queueManager as any).itemTemplate;
    
    if (queueItemSchema && typeof queueItemSchema === 'object') {
      // Create a Zod schema based on the queue item template
      const schemaShape: Record<string, z.ZodTypeAny> = {};
      
      for (const [key, type] of Object.entries(queueItemSchema)) {
        // Convert the string type to corresponding Zod type
        switch (String(type).toLowerCase()) {
          case 'string':
            schemaShape[key] = z.string();
            break;
          case 'number':
            schemaShape[key] = z.number();
            break;
          case 'boolean':
            schemaShape[key] = z.boolean();
            break;
          case 'object':
            schemaShape[key] = z.record(z.any());
            break;
          case 'array':
            schemaShape[key] = z.array(z.any());
            break;
          default:
            // For unknown types, use any
            schemaShape[key] = z.any();
        }
      }
      
      itemSchema = z.object(schemaShape);
    } else {
      // Fallback to generic object if no schema is defined
      itemSchema = z.record(z.any());
      logger.info(`No specific item schema found, using generic object schema`);
    }
    
    // Start with required item parameter using the determined schema
    let schema = z.object({
      item: itemSchema
    });
    
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
  async execute(params: PushToolParams): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    try {
      // Check that item is provided
      if (!params.item || typeof params.item !== 'object') {
        return errorHandler.createErrorResponse('Item parameter must be an object');
      }
      
      // Determine which direction to push to
      const direction = this.directionExposed
        ? (params.direction || this.defaultDirection)
        : this.defaultDirection;
      
      // Validate the item
      if (!this.queueManager.validateItem(params.item)) {
        return errorHandler.createErrorResponse('Item does not match the required schema');
      }
      
      // Push the item
      if (direction === 'front') {
        await this.queueManager.pushFront(params.item);
      } else {
        await this.queueManager.pushBack(params.item);
      }
      
      return errorHandler.createSuccessResponse('Item added to queue');
    } catch (error) {
      logger.error(`Error executing ${this.name} tool`, error);
      return errorHandler.handleUnknownError(error);
    }
  }
} 