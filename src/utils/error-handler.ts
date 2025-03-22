/**
 * Error handling utilities
 */

import * as logger from './logger.js';

/**
 * Standard error response for MCP
 */
export interface McpErrorResponse {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

/**
 * Create a formatted error response for MCP
 * @param message Error message
 * @param error Optional original error object for logging
 * @returns Formatted MCP error response
 */
export function createErrorResponse(message: string, error?: any): McpErrorResponse {
  // Log the full error for debugging
  if (error) {
    logger.error(message, error);
  } else {
    logger.error(message);
  }

  // Return a formatted response for MCP
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true
  };
}

/**
 * Create a formatted success response for MCP
 * @param content The content to return
 * @returns Formatted MCP success response
 */
export function createSuccessResponse(content: string): { content: Array<{ type: string; text: string }> } {
  return {
    content: [{ type: 'text', text: content }]
  };
}

/**
 * Handle unknown errors by creating an appropriate response
 * @param error The error that occurred
 * @returns Formatted MCP error response
 */
export function handleUnknownError(error: unknown): McpErrorResponse {
  if (error instanceof Error) {
    return createErrorResponse(error.message, error);
  } else if (typeof error === 'string') {
    return createErrorResponse(error);
  } else {
    return createErrorResponse('An unknown error occurred', error);
  }
} 