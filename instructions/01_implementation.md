# QueueMincer Implementation Guide

## Project Structure

```
src/
├── config/
│   ├── schema.ts          # JSON schema definitions and validation
│   └── types.ts           # TypeScript interfaces for configuration
├── loaders/
│   ├── index.ts           # Loader factory and common interface
│   ├── json-loader.ts     # JSON file loader implementation
│   ├── csv-loader.ts      # CSV file loader implementation
│   ├── googlesheet-loader.ts # Google Sheet loader implementation
│   └── memory-loader.ts   # In-memory loader implementation
├── tools/
│   ├── index.ts           # Tool registration and common interfaces
│   ├── get-tool.ts        # Get tool implementation
│   ├── push-tool.ts       # Push tool implementation
│   └── load-tool.ts       # Load tool implementation
├── queue/
│   ├── queue-manager.ts   # Queue operations and state management
│   └── item-validator.ts  # Item structure validation
├── utils/
│   ├── logger.ts          # Logging utility
│   └── error-handler.ts   # Error handling utilities
├── index.ts               # Main entry point
└── server.ts              # MCP server implementation
```

## Required Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.1.0",
    "zod": "^3.22.4",
    "zod-to-json-schema": "^3.22.3",
    "csv-parser": "^3.0.0",
    "googleapis": "^129.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
```

## Implementation Order

1. **Configuration and Type Definitions**
   - Define all TypeScript interfaces for configuration
   - Implement schema validation using Zod

2. **Queue Manager**
   - Implement core queue operations (add, remove, get)
   - Create item validation logic

3. **Loaders**
   - Define common loader interface
   - Implement each loader type starting with memory (simplest)
   - Add JSON, CSV, then Google Sheets loaders

4. **Tool Implementations**
   - Create base tool interface
   - Implement get, push, and load tools
   - Add parameter validation and handling

5. **MCP Server**
   - Set up MCP server with the SDK
   - Register tools with appropriate handlers
   - Implement error handling

6. **Entry Point**
   - Create configuration loading logic
   - Initialize server with configured components

## Key Interfaces

### Configuration Interfaces

```typescript
// src/config/types.ts

export interface QueueMincerConfig {
  tools: ToolsConfig;
  queue: QueueConfig;
}

export interface ToolsConfig {
  get?: GetToolConfig;
  push?: PushToolConfig;
  load?: LoadToolConfig;
}

export interface BaseToolConfig {
  alias?: string;
  visible?: boolean;
  description?: string;
}

export interface GetToolConfig extends BaseToolConfig {
  directionExposed?: boolean;
  default?: 'front' | 'back';
}

export interface PushToolConfig extends BaseToolConfig {
  directionExposed?: boolean;
  default?: 'front' | 'back';
}

export interface LoadToolConfig extends BaseToolConfig {
  actionExposed?: boolean;
  templateIdExposed?: boolean;
  default?: 'replace' | 'front' | 'back';
}

export interface QueueConfig {
  loader: 'json' | 'csv' | 'googleSheet' | 'memory';
  inMemory?: boolean;
  put?: boolean;
  itemTemplate?: Record<string, string>;
}
```

### Loader Interface

```typescript
// src/loaders/index.ts

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

export function createLoader(config: QueueConfig): QueueLoader {
  // Implementation to create the appropriate loader based on config
}
```

### Queue Manager Interface

```typescript
// src/queue/queue-manager.ts

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
```

### Tool Interface

```typescript
// src/tools/index.ts

import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";

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
```

## Implementation Requirements for Debugging

The debugging functionality must be implemented using the Node.js Inspector API. Here's the specific code to be included in the main file:

```typescript
import inspector from 'inspector';

// Function to initialize debugging based on configuration
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

// Call this function early in the startup process
// initializeDebugger(config.debug);
```

This code should be included in the main entry point of the application and called before setting up the MCP server.

## Key Design Principles

### Dynamic Tool Registration

The core feature of QueueMincer is its ability to dynamically configure and expose tools based on the provided configuration:

- Tools should be created and registered at runtime based on the configuration
- Tool visibility, naming (aliases), and parameter exposure must be dynamically controlled
- The same underlying functionality (get/push/load) should be adaptable to different agent needs through configuration
- MCP tool schemas must be generated dynamically based on which parameters are exposed

This dynamic approach allows the same server to present different interfaces to different agents without code changes - just by switching configuration files.

## Implementation Guidelines

### Configuration Validation

The configuration should be validated using Zod:
- Define schemas that match the configuration interfaces
- Implement validation functions that verify the configuration against these schemas
- Ensure proper validation of conditional requirements (e.g., memory loader requires put: true)
- Provide clear error messages for invalid configurations

### MCP Server Implementation

The MCP server should:
- Use the `@modelcontextprotocol/sdk` package
- Connect with the appropriate transport (stdio)
- Register tools based on the configuration
- Implement handlers for tool listing and execution
- Follow the MCP protocol for response formatting
- Properly handle and format errors

### Main Entry Point Structure

The main application should:
- Accept a configuration file path as a command-line argument
- Load and validate the configuration
- Initialize components in the right order
- Start the MCP server
- Implement proper error handling and logging

## Code Quality Expectations

- Follow the TypeScript coding guidelines as provided
- Handle edge cases properly (empty arrays, null values, etc.)
- Implement appropriate error handling with descriptive messages
- Write modular, reusable code with clear separation of concerns
- Focus on correctness and simplicity over premature optimization

## Error Handling Guidelines

1. Configuration errors should be caught at startup and provide clear messages
2. Runtime errors should be properly formatted for MCP responses
3. Implement proper error logging for debugging

## Performance Considerations

1. For in-memory queues, avoid unnecessary copying of data
2. Cache template data when possible
3. Implement proper cleanup for external resources

## Development Sequence (Important!)

To prevent dependency issues during development, follow this strict sequence:

1. **Define All Interfaces First**
   - Create all TypeScript interfaces for config, tools, loaders, etc.
   - Place in appropriate files under their respective directories
   - This establishes the "contract" between all components

2. **Create Project Skeleton**
   - Set up the complete folder structure
   - Create all files with minimal exports
   - Ensure the project compiles even with minimal implementation

3. **Implement Factory Functions with Stubs**
   - Create factories that return stub implementations
   - Example: `createLoader` should return a stub `QueueLoader` that satisfies the interface
   - These stubs can return empty arrays, null values, or simple defaults

4. **Implement Core Functionality**
   - First implement configuration validation
   - Then implement the entry point with proper error handling
   - Then implement the MCP server framework

5. **Implement Individual Components**
   - Start with simpler components (memory loader)
   - Move to more complex ones (other loaders)
   - Implement tools one by one

This approach ensures that the project always compiles during development and prevents interface mismatches between components.