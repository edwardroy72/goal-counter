/**
 * Logging Utility
 *
 * Centralized logging with configurable levels.
 * Automatically disabled in test environment to reduce noise.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

const defaultConfig: LoggerConfig = {
  enabled: !isTest,
  level: isDev ? "debug" : "warn",
  prefix: "[GoalCounter]",
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(tag: string, message: string): string {
    return `${this.config.prefix}[${tag}] ${message}`;
  }

  debug(tag: string, message: string, data?: unknown): void {
    if (this.shouldLog("debug")) {
      if (data !== undefined) {
        console.log(this.formatMessage(tag, message), data);
      } else {
        console.log(this.formatMessage(tag, message));
      }
    }
  }

  info(tag: string, message: string, data?: unknown): void {
    if (this.shouldLog("info")) {
      if (data !== undefined) {
        console.info(this.formatMessage(tag, message), data);
      } else {
        console.info(this.formatMessage(tag, message));
      }
    }
  }

  warn(tag: string, message: string, data?: unknown): void {
    if (this.shouldLog("warn")) {
      if (data !== undefined) {
        console.warn(this.formatMessage(tag, message), data);
      } else {
        console.warn(this.formatMessage(tag, message));
      }
    }
  }

  error(tag: string, message: string, error?: unknown): void {
    if (this.shouldLog("error")) {
      if (error !== undefined) {
        console.error(this.formatMessage(tag, message), error);
      } else {
        console.error(this.formatMessage(tag, message));
      }
    }
  }

  /**
   * Create a scoped logger with a fixed tag
   */
  scope(tag: string): ScopedLogger {
    return new ScopedLogger(this, tag);
  }
}

class ScopedLogger {
  constructor(private logger: Logger, private tag: string) {}

  debug(message: string, data?: unknown): void {
    this.logger.debug(this.tag, message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(this.tag, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(this.tag, message, data);
  }

  error(message: string, error?: unknown): void {
    this.logger.error(this.tag, message, error);
  }
}

// Default logger instance
export const logger = new Logger();

// Convenience exports for common use cases
export const createLogger = (prefix: string) => new Logger({ prefix });
