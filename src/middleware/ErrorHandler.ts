/**
 * Error Handler Middleware
 * 
 * Comprehensive error handling middleware for MCP operations.
 * Implements security-focused error handling with detailed logging and sanitization.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { Configuration } from '../models/Configuration';
import { AuditLoggingService } from '../services/AuditLoggingService';

export interface ErrorContext {
  userId: string;
  clientId: string;
  clientType: string;
  operation: string;
  timestamp: Date;
  ipAddress?: string;
  sessionId?: string;
  requestId?: string;
  toolName?: string;
  input?: any;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
    operation?: string;
    tool?: string;
  };
  success: false;
}

export interface ErrorHandlerOptions {
  includeStackTrace?: boolean;
  includeInput?: boolean;
  sanitizeErrors?: boolean;
  logErrors?: boolean;
  maxErrorDetails?: number;
}

export class ErrorHandler {
  private config: Configuration;
  private auditLoggingService: AuditLoggingService;
  private options: ErrorHandlerOptions;

  constructor(
    config: Configuration,
    auditLoggingService: AuditLoggingService,
    options: ErrorHandlerOptions = {}
  ) {
    this.config = config;
    this.auditLoggingService = auditLoggingService;
    this.options = {
      includeStackTrace: false,
      includeInput: false,
      sanitizeErrors: true,
      logErrors: true,
      maxErrorDetails: 1000,
      ...options,
    };
  }

  /**
   * Handles errors and returns standardized error responses
   */
  async handleError(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const startTime = Date.now();

    try {
      // Categorize and process the error
      const processedError = this.processError(error, context);
      
      // Log the error
      if (this.options.logErrors) {
        await this.logError(processedError, context);
      }

      // Create error response
      const response = this.createErrorResponse(processedError, context);

      return response;
    } catch (handlerError) {
      // Fallback error handling
      console.error('Error handler failed:', handlerError);
      
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred while processing the request',
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
          operation: context.operation,
          tool: context.toolName,
        },
        success: false,
      };
    }
  }

  /**
   * Handles validation errors
   */
  async handleValidationError(
    validationResult: any,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InvalidParams,
      'Validation failed',
      {
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles permission errors
   */
  async handlePermissionError(
    reason: string,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InvalidRequest,
      `Permission denied: ${reason}`,
      {
        reason,
        operation: context.operation,
        path: context.input?.path,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles path validation errors
   */
  async handlePathValidationError(
    reason: string,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InvalidRequest,
      `Path validation failed: ${reason}`,
      {
        reason,
        path: context.input?.path,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles file system errors
   */
  async handleFileSystemError(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const mcpError = new McpError(
      ErrorCode.InternalError,
      `File system operation failed: ${error.message}`,
      {
        originalError: error.message,
        operation: context.operation,
        path: context.input?.path,
      }
    );

    return this.handleError(mcpError, context);
  }

  /**
   * Handles cache errors
   */
  async handleCacheError(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    const mcpError = new McpError(
      ErrorCode.InternalError,
      `Cache operation failed: ${error.message}`,
      {
        originalError: error.message,
        operation: context.operation,
      }
    );

    return this.handleError(mcpError, context);
  }

  /**
   * Handles rate limiting errors
   */
  async handleRateLimitError(
    context: ErrorContext,
    retryAfter?: number
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InvalidRequest,
      'Rate limit exceeded',
      {
        retryAfter,
        operation: context.operation,
        clientId: context.clientId,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles timeout errors
   */
  async handleTimeoutError(
    context: ErrorContext,
    timeoutMs: number
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InternalError,
      `Operation timed out after ${timeoutMs}ms`,
      {
        timeoutMs,
        operation: context.operation,
        tool: context.toolName,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles memory limit errors
   */
  async handleMemoryLimitError(
    context: ErrorContext,
    memoryUsage: number
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InternalError,
      'Memory limit exceeded',
      {
        memoryUsage,
        operation: context.operation,
        tool: context.toolName,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Handles concurrent operation limit errors
   */
  async handleConcurrentLimitError(
    context: ErrorContext,
    currentOperations: number,
    maxOperations: number
  ): Promise<ErrorResponse> {
    const error = new McpError(
      ErrorCode.InvalidRequest,
      'Too many concurrent operations',
      {
        currentOperations,
        maxOperations,
        operation: context.operation,
        clientId: context.clientId,
      }
    );

    return this.handleError(error, context);
  }

  /**
   * Creates a standardized error response
   */
  private createErrorResponse(
    processedError: ProcessedError,
    context: ErrorContext
  ): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: processedError.code,
        message: processedError.message,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        operation: context.operation,
        tool: context.toolName,
      },
      success: false,
    };

    // Add details if allowed
    if (processedError.details && this.options.maxErrorDetails > 0) {
      const details = JSON.stringify(processedError.details);
      if (details.length <= this.options.maxErrorDetails) {
        response.error.details = processedError.details;
      } else {
        response.error.details = {
          message: 'Error details too large to include',
          size: details.length,
        };
      }
    }

    return response;
  }

  /**
   * Processes and categorizes errors
   */
  private processError(error: Error, context: ErrorContext): ProcessedError {
    let code: string;
    let message: string;
    let details: any = {};

    if (error instanceof McpError) {
      code = error.code;
      message = error.message;
      details = error.data || {};
    } else if (error.name === 'ValidationError') {
      code = 'VALIDATION_ERROR';
      message = 'Input validation failed';
      details = { originalError: error.message };
    } else if (error.name === 'PermissionError') {
      code = 'PERMISSION_DENIED';
      message = 'Permission denied';
      details = { originalError: error.message };
    } else if (error.name === 'PathValidationError') {
      code = 'PATH_VALIDATION_FAILED';
      message = 'Path validation failed';
      details = { originalError: error.message };
    } else if (error.name === 'FileSystemError') {
      code = 'FILE_SYSTEM_ERROR';
      message = 'File system operation failed';
      details = { originalError: error.message };
    } else if (error.name === 'CacheError') {
      code = 'CACHE_ERROR';
      message = 'Cache operation failed';
      details = { originalError: error.message };
    } else if (error.name === 'RateLimitError') {
      code = 'RATE_LIMIT_EXCEEDED';
      message = 'Rate limit exceeded';
      details = { originalError: error.message };
    } else if (error.name === 'TimeoutError') {
      code = 'TIMEOUT_ERROR';
      message = 'Operation timed out';
      details = { originalError: error.message };
    } else if (error.name === 'MemoryLimitError') {
      code = 'MEMORY_LIMIT_EXCEEDED';
      message = 'Memory limit exceeded';
      details = { originalError: error.message };
    } else if (error.name === 'ConcurrentLimitError') {
      code = 'CONCURRENT_LIMIT_EXCEEDED';
      message = 'Too many concurrent operations';
      details = { originalError: error.message };
    } else {
      code = 'INTERNAL_ERROR';
      message = this.options.sanitizeErrors ? 
        'An internal error occurred' : 
        error.message;
      details = this.options.sanitizeErrors ? {} : { originalError: error.message };
    }

    // Add context information
    details.operation = context.operation;
    details.tool = context.toolName;
    details.timestamp = context.timestamp.toISOString();

    // Add input information if allowed
    if (this.options.includeInput && context.input) {
      details.input = this.sanitizeInput(context.input);
    }

    // Add stack trace if allowed
    if (this.options.includeStackTrace && error.stack) {
      details.stackTrace = error.stack;
    }

    return {
      code,
      message,
      details,
      originalError: error,
    };
  }

  /**
   * Logs errors for audit and debugging
   */
  private async logError(
    processedError: ProcessedError,
    context: ErrorContext
  ): Promise<void> {
    try {
      await this.auditLoggingService.logFailure(
        context.userId,
        context.clientId,
        context.clientType,
        context.operation,
        processedError.code,
        processedError.message,
        0, // Duration not available for errors
        {
          tool: context.toolName,
          errorDetails: processedError.details,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          sessionId: context.sessionId,
        }
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Sanitizes input data for logging
   */
  private sanitizeInput(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return input;
    }

    const sanitized: any = {};
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];

    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Updates error handler options
   */
  updateOptions(newOptions: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Gets current error handler options
   */
  getOptions(): ErrorHandlerOptions {
    return { ...this.options };
  }
}

interface ProcessedError {
  code: string;
  message: string;
  details: any;
  originalError: Error;
}
