/**
 * Tool registration and common interfaces
 */

import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { QueueMincerConfig } from '../config/types.js';
import { QueueManager } from '../queue/queue-manager.js';

/**
 * Common interface for QueueMincer tools
 */
export interface QueueMincerTool {
  /**
   * Get the name of the tool
   */
  getName(): string;
  
  /**
   * Get the description of the tool
   */
  getDescription(): string;
  
  /**
   * Get the input schema for the tool
   */
  getInputSchema(): any;
  
  /**
   * Execute the tool with given parameters
   */
  execute(params: any): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

/**
 * Create and register all tools based on configuration
 */
export async function createTools(
  config: QueueMincerConfig,
  queueManager: QueueManager
): Promise<QueueMincerTool[]> {
  const tools: QueueMincerTool[] = [];
  
  // Create Get Tool if configured and visible
  if (config.tools.get && config.tools.get.visible !== false) {
    const { GetTool } = await import('./get-tool.js');
    tools.push(new GetTool(config.tools.get, queueManager));
  }
  
  // Create Push Tool if configured and visible
  if (config.tools.push && config.tools.push.visible !== false) {
    const { PushTool } = await import('./push-tool.js');
    tools.push(new PushTool(config.tools.push, queueManager));
  }
  
  // Create Load Tool if configured and visible
  if (config.tools.load && config.tools.load.visible !== false) {
    const { LoadTool } = await import('./load-tool.js');
    tools.push(new LoadTool(config.tools.load, queueManager));
  }
  
  return tools;
}

/**
 * Convert a tool to MCP tool schema format
 */
export function toolToSchema(tool: QueueMincerTool): any {
  return {
    name: tool.getName(),
    description: tool.getDescription(),
    inputSchema: tool.getInputSchema()
  };
} 