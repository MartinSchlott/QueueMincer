/**
 * Configuration schema validation using Zod
 */

import { z } from 'zod';
import { DebugConfig, QueueMincerConfig } from './types.js';

// Base tool configuration schema
const baseToolConfigSchema = z.object({
  alias: z.string().optional(),
  visible: z.boolean().optional().default(true),
  description: z.string().optional()
});

// Get tool configuration schema
const getToolConfigSchema = baseToolConfigSchema.extend({
  directionExposed: z.boolean().optional().default(false),
  default: z.enum(['front', 'back']).optional().default('front'),
  emptyQueueMessage: z.string().optional()
});

// Push tool configuration schema
const pushToolConfigSchema = baseToolConfigSchema.extend({
  directionExposed: z.boolean().optional().default(true),
  default: z.enum(['front', 'back']).optional().default('back')
});

// Load tool configuration schema
const loadToolConfigSchema = baseToolConfigSchema.extend({
  actionExposed: z.boolean().optional().default(false),
  templateIdExposed: z.boolean().optional().default(true),
  default: z.enum(['replace', 'front', 'back']).optional().default('replace')
});

// Tools configuration schema
const toolsConfigSchema = z.object({
  get: getToolConfigSchema.optional(),
  push: pushToolConfigSchema.optional(),
  load: loadToolConfigSchema.optional()
});

// Queue configuration schema with conditional validation
const queueConfigSchema = z.object({
  loader: z.enum(['json', 'csv', 'googleSheet', 'memory']),
  inMemory: z.boolean().optional().default(false),
  put: z.boolean().optional(),
  itemTemplate: z.record(z.string(), z.string()).optional()
}).refine(data => {
  // If loader is memory, put must be true
  if (data.loader === 'memory' && data.put !== true) {
    return false;
  }
  return true;
}, {
  message: "When loader is 'memory', put must be true"
});

// Debug configuration schema
const debugConfigSchema = z.object({
  active: z.boolean().optional().default(false),
  port: z.number().int().positive().optional().default(9229),
  break: z.boolean().optional().default(false)
});

// Root QueueMincer configuration schema
export const queueMincerConfigSchema = z.object({
  tools: toolsConfigSchema,
  queue: queueConfigSchema,
  debug: debugConfigSchema.optional().default({
    active: false,
    port: 9229,
    break: false
  })
});

/**
 * Validates the provided configuration
 * @param config Configuration object to validate
 * @returns Validated configuration with defaults applied
 * @throws Error if validation fails
 */
export function validateConfig(config: any): QueueMincerConfig {
  try {
    return queueMincerConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

/**
 * Validates just the debug configuration portion
 * @param config Debug configuration object to validate
 * @returns Validated debug configuration with defaults applied
 */
export function validateDebugConfig(config?: Partial<DebugConfig>): DebugConfig {
  return debugConfigSchema.parse(config || {});
} 