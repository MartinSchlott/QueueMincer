/**
 * QueueMincer - Main Entry Point
 */

// Node.js imports
import process from 'process';
import fs from 'fs/promises';
import path from 'path';
import inspector from 'inspector';

// Local imports
import { validateConfig, validateDebugConfig } from './config/schema.js';
import { QueueMincerConfig } from './config/types.js';
import { createLoader } from './loaders/index.js';
import { DefaultQueueManager } from './queue/queue-manager.js';
import { createTools } from './tools/index.js';
import { QueueMincerServer } from './server.js';
import * as logger from './utils/logger.js';

/**
 * Initialize debugging based on configuration
 */
function initializeDebugger(debugConfig?: { active?: boolean; port?: number; break?: boolean }) {
  if (!debugConfig || !debugConfig.active) {
    return;
  }
  
  const port = debugConfig.port || 9229;
  const shouldBreak = debugConfig.break || false;
  
  inspector.open(port, undefined, false);
  console.error(`Debugger listening on port ${port}`);
  
  if (shouldBreak) {
    debugger; // This will set an immediate breakpoint
  }
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath: string): Promise<QueueMincerConfig> {
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    return validateConfig(config);
  } catch (error) {
    logger.error(`Failed to load configuration from ${configPath}`, error);
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main application entry point
 */
const main = async (): Promise<void> => {
  try {
    // Get configuration file path from command line
    const configPath = process.argv[2] || path.join(process.cwd(), 'config.json');
    logger.info(`Loading configuration from ${configPath}`);
    
    // Load and validate configuration
    const config = await loadConfig(configPath);
    
    // Initialize debugger if configured
    initializeDebugger(config.debug);
    
    // Create components
    const loader = createLoader(config.queue);
    const queueManager = new DefaultQueueManager(config.queue, loader);
    await queueManager.initialize();
    
    // Create and register tools
    const tools = createTools(config, queueManager);
    
    // Create and start MCP server
    const server = new QueueMincerServer(config);
    server.registerTools(tools);
    await server.start();
  } catch (error) {
    logger.error('Error in QueueMincer', error);
    process.exit(1);
  }
};

// Run the application
main().catch(error => {
  console.error('Unhandled error in QueueMincer:', error);
  process.exit(1);
}); 