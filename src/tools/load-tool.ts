/**
 * Load Tool Implementation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LoadToolConfig, LoadToolParams } from '../config/types.js';
import { QueueManager } from '../queue/queue-manager.js';
import { QueueMincerTool } from './index.js';
import * as errorHandler from '../utils/error-handler.js';
import * as logger from '../utils/logger.js';

/**
 * Tool for loading items from templates
 */
export class LoadTool implements QueueMincerTool {
  private readonly name: string;
  private readonly description: string;
  private readonly actionExposed: boolean;
  private readonly templateIdExposed: boolean;
  private readonly defaultAction: 'replace' | 'front' | 'back';
  
  constructor(
    private config: LoadToolConfig,
    private queueManager: QueueManager
  ) {
    this.name = config.alias || 'load';
    this.description = config.description || 'Load items from template';
    this.actionExposed = config.actionExposed || false;
    this.templateIdExposed = config.templateIdExposed || true;
    this.defaultAction = config.default || 'replace';
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
    // Start building the schema
    let schemaObj: Record<string, any> = {};
    
    // Add templateId parameter if exposed
    if (this.templateIdExposed) {
      schemaObj.templateId = z.string().optional();
    }
    
    // Add action parameter if exposed
    if (this.actionExposed) {
      schemaObj.action = z.enum(['replace', 'front', 'back']).optional().default(this.defaultAction);
    }
    
    // Create the schema
    const schema = z.object(schemaObj);
    
    // Convert to JSON schema
    return zodToJsonSchema(schema);
  }
  
  /**
   * Execute the tool with given parameters
   */
  async execute(params: LoadToolParams): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    try {
      // Determine which action to perform
      const action = this.actionExposed
        ? (params.action || this.defaultAction)
        : this.defaultAction;
      
      // Determine which template to load
      let templateId = '';
      if (this.templateIdExposed) {
        if (!params.templateId) {
          return errorHandler.createErrorResponse('templateId parameter is required');
        }
        templateId = params.templateId;
      }
      
      // Perform the action
      switch (action) {
        case 'replace':
          await this.queueManager.replaceFromTemplate(templateId);
          return errorHandler.createSuccessResponse(`Queue replaced with items from template: ${templateId}`);
        
        case 'front':
          await this.queueManager.addFrontFromTemplate(templateId);
          return errorHandler.createSuccessResponse(`Items from template ${templateId} added to front of queue`);
        
        case 'back':
          await this.queueManager.addBackFromTemplate(templateId);
          return errorHandler.createSuccessResponse(`Items from template ${templateId} added to back of queue`);
        
        default:
          return errorHandler.createErrorResponse(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`Error executing ${this.name} tool`, error);
      return errorHandler.handleUnknownError(error);
    }
  }
} 