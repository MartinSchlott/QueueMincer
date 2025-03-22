/**
 * Configuration type definitions for QueueMincer
 */

export interface QueueMincerConfig {
  tools: ToolsConfig;
  queue: QueueConfig;
  debug?: DebugConfig;
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

export interface DebugConfig {
  active?: boolean;
  port?: number;
  break?: boolean;
}

// Parameter interfaces for tools
export interface GetToolParams {
  direction?: 'front' | 'back';
}

export interface PushToolParams {
  item: Record<string, any>;
  direction?: 'front' | 'back';
}

export interface LoadToolParams {
  templateId?: string;
  action?: 'replace' | 'front' | 'back';
} 