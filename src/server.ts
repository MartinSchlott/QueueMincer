/**
 * MCP Server Implementation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { QueueMincerConfig } from './config/types.js';
import { QueueMincerTool, toolToSchema } from './tools/index.js';
import * as logger from './utils/logger.js';
import * as errorHandler from './utils/error-handler.js';

/**
 * MCP Server for QueueMincer
 */
export class QueueMincerServer {
  private server: Server;
  private tools: QueueMincerTool[] = [];
  
  /**
   * Create a new MCP server
   * @param config QueueMincer configuration
   */
  constructor(private config: QueueMincerConfig) {
    // Initialize MCP server
    this.server = new Server(
      {
        name: "queue-mincer",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }
  
  /**
   * Register a set of tools with the server
   * @param tools Array of QueueMincer tools
   */
  registerTools(tools: QueueMincerTool[]): void {
    this.tools = tools;
    logger.info(`Registered ${tools.length} tools`);
  }
  
  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Set up handlers
    this.setupHandlers();
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('QueueMincer MCP server running on stdio');
  }
  
  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        // Convert tools to MCP schema format
        const toolSchemas = this.tools.map(tool => toolToSchema(tool));
        logger.debug(`Returning ${toolSchemas.length} tools`);
        
        return {
          tools: toolSchemas
        };
      } catch (error) {
        logger.error('Error handling ListTools request', error);
        throw error;
      }
    });
    
    // Handler for executing tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        logger.debug(`Executing tool: ${name}`);
        
        // Find the requested tool
        const tool = this.tools.find(t => t.getName() === name);
        
        if (!tool) {
          return errorHandler.createErrorResponse(`Unknown tool: ${name}`);
        }
        
        // Execute the tool
        return await tool.execute(args);
      } catch (error) {
        logger.error('Error handling CallTool request', error);
        return errorHandler.handleUnknownError(error);
      }
    });
  }
} 