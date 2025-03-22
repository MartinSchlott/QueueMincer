/**
 * Basic logger utility
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Default log level - can be overridden
let currentLogLevel = LogLevel.INFO;

/**
 * Set the logging level
 * @param level The log level to set
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Log a message at the error level
 * @param message The message to log
 * @param data Optional data to include
 */
export function error(message: string, data?: any): void {
  if (currentLogLevel >= LogLevel.ERROR) {
    console.error(`ERROR: ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log a message at the warn level
 * @param message The message to log
 * @param data Optional data to include
 */
export function warn(message: string, data?: any): void {
  if (currentLogLevel >= LogLevel.WARN) {
    console.warn(`WARN: ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log a message at the info level
 * @param message The message to log
 * @param data Optional data to include
 */
export function info(message: string, data?: any): void {
  if (currentLogLevel >= LogLevel.INFO) {
    console.info(`INFO: ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log a message at the debug level
 * @param message The message to log
 * @param data Optional data to include
 */
export function debug(message: string, data?: any): void {
  if (currentLogLevel >= LogLevel.DEBUG) {
    console.debug(`DEBUG: ${message}`, data !== undefined ? data : '');
  }
} 